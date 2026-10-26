#!/usr/bin/env python3
"""Server Manager: a web file manager for YunoHost.

A small, dependency-free HTTP backend (Python standard library only) that
lets authenticated YunoHost users browse, upload, download, edit, move,
copy, delete and change permissions of files on the server, much like an
SFTP client such as FileZilla would.

The service is meant to listen on localhost only, behind NGINX + SSOwat.
SSOwat authenticates the user and passes the username in the YNH_USER
header (and strips any such header coming from the client).
"""

import codecs
import errno
import fnmatch
import functools
import grp
import json
import logging
import mimetypes
import os
import posixpath
import pwd
import shutil
import socket
import stat
import sys
import tarfile
import tempfile
import time
import zipfile
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlsplit

from terminal import TerminalError, TerminalManager, WebSocket, accept_key, clamp

VERSION = "1.1.1"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

CHUNK_SIZE = 1024 * 1024
MAX_JSON_BODY = 64 * 1024 * 1024
MAX_EDIT_SIZE = int(os.environ.get("SM_MAX_EDIT_SIZE", 10 * 1024 * 1024))
SEARCH_MAX_RESULTS = 1000
SEARCH_MAX_SECONDS = 20

# Paths that can never be deleted, renamed or moved, whatever the root is.
# This is a last line of defence against a slip of the mouse when the app
# runs with full access to the system.
PROTECTED_PATHS = {
    "/", "/bin", "/boot", "/dev", "/etc", "/home", "/lib", "/lib32",
    "/lib64", "/libx32", "/media", "/mnt", "/opt", "/proc", "/root",
    "/run", "/sbin", "/srv", "/sys", "/tmp", "/usr", "/var", "/var/www",
    "/var/lib", "/var/log", "/etc/yunohost", "/home/yunohost.app",
    "/home/yunohost.backup", "/home/yunohost.multimedia",
}

# Pseudo filesystems that are skipped by recursive searches when the root is /
SEARCH_SKIP_DIRS = {"/proc", "/sys", "/dev", "/run"}

ARCHIVE_SUFFIXES = (".zip", ".tar", ".tar.gz", ".tgz", ".tar.bz2", ".tbz2",
                    ".tar.xz", ".txz")

PREVIEW_TYPES = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp",
    ".ico": "image/x-icon", ".avif": "image/avif",
}

log = logging.getLogger("server-manager")


class ApiError(Exception):
    def __init__(self, status, message, code=None, extra=None):
        super().__init__(message)
        self.status = status
        self.message = message
        self.code = code
        self.extra = extra or {}


def os_error_to_api(exc, vpath=None):
    where = f" ({vpath})" if vpath else ""
    if isinstance(exc, ApiError):
        return exc
    if isinstance(exc, PermissionError):
        return ApiError(403, f"Permission denied{where}")
    if isinstance(exc, FileNotFoundError):
        return ApiError(404, f"No such file or folder{where}")
    if isinstance(exc, FileExistsError):
        return ApiError(409, f"Already exists{where}", code="exists")
    if isinstance(exc, IsADirectoryError):
        return ApiError(400, f"Is a folder{where}")
    if isinstance(exc, NotADirectoryError):
        return ApiError(400, f"Not a folder{where}")
    if isinstance(exc, OSError):
        if exc.errno == errno.ENOTEMPTY:
            return ApiError(409, f"Folder is not empty{where}")
        if exc.errno == errno.ENOSPC:
            return ApiError(507, f"No space left on device{where}")
        if exc.errno in (errno.EROFS,):
            return ApiError(403, f"Read-only file system{where}")
        return ApiError(500, f"{exc.strerror or exc}{where}")
    return ApiError(500, str(exc))


@functools.lru_cache(maxsize=4096)
def user_name(uid):
    try:
        return pwd.getpwuid(uid).pw_name
    except KeyError:
        return str(uid)


@functools.lru_cache(maxsize=4096)
def group_name(gid):
    try:
        return grp.getgrgid(gid).gr_name
    except KeyError:
        return str(gid)


def mode_string(mode):
    return stat.filemode(mode)


def get_umask():
    current = os.umask(0)
    os.umask(current)
    return current


class FileSystem:
    """Maps the virtual paths seen by the browser to real paths on disk."""

    def __init__(self, root, inherit_owner=True):
        self.root = os.path.realpath(root)
        self.is_root_user = os.geteuid() == 0
        self.inherit_owner = inherit_owner and self.is_root_user
        self.umask = get_umask()

    # ---- path helpers ------------------------------------------------------

    def to_real(self, vpath):
        """Return (real_path, normalized_virtual_path) for a virtual path."""
        if not isinstance(vpath, str) or vpath == "":
            raise ApiError(400, "Missing path")
        if "\x00" in vpath:
            raise ApiError(400, "Invalid path")
        norm = posixpath.normpath("/" + vpath.lstrip("/"))
        rel = norm.lstrip("/")
        real = os.path.join(self.root, rel) if rel else self.root
        return real, "/" + rel

    def to_virtual(self, real):
        if self.root == "/":
            return real
        rel = os.path.relpath(real, self.root)
        return "/" if rel == "." else "/" + rel

    def _inside(self, real):
        if self.root == "/":
            return True
        return real == self.root or real.startswith(self.root + os.sep)

    def check_contained(self, real, follow=True):
        """Make sure symlinks don't let the user escape the managed folder."""
        if self.root == "/" or real == self.root:
            return
        if follow:
            target = os.path.realpath(real)
        else:
            target = os.path.join(os.path.realpath(os.path.dirname(real)),
                                  os.path.basename(real))
        if not self._inside(target):
            raise ApiError(403, "This path points outside of the managed folder")

    def resolve(self, vpath, follow=True):
        real, vpath = self.to_real(vpath)
        self.check_contained(real, follow=follow)
        return real, vpath

    def real_system_path(self, real):
        """The absolute path on the system, used for safety checks."""
        return os.path.abspath(real)

    def check_not_protected(self, real, vpath):
        if real == self.root:
            raise ApiError(403, "The top folder cannot be deleted, renamed or moved")
        if self.real_system_path(real) in PROTECTED_PATHS:
            raise ApiError(403, f"{vpath} is an essential system folder and is protected")

    # ---- ownership ---------------------------------------------------------

    def adopt(self, path, recursive=False):
        """When running as root, give newly created files the owner and group
        of the folder they were created in, like a regular user would get."""
        if not self.inherit_owner:
            return
        try:
            parent = os.stat(os.path.dirname(path))
        except OSError:
            return
        uid, gid = parent.st_uid, parent.st_gid
        try:
            os.lchown(path, uid, gid)
            if recursive and os.path.isdir(path) and not os.path.islink(path):
                for dirpath, dirnames, filenames in os.walk(path):
                    for name in dirnames + filenames:
                        os.lchown(os.path.join(dirpath, name), uid, gid)
        except OSError as exc:
            log.warning("Could not set ownership of %s: %s", path, exc)

    def new_file_mode(self):
        return 0o666 & ~self.umask

    # ---- entries -----------------------------------------------------------

    def entry(self, dirpath, name):
        full = os.path.join(dirpath, name)
        st = os.lstat(full)
        info = {
            "name": name,
            "size": st.st_size,
            "mtime": int(st.st_mtime),
            "mode": format(stat.S_IMODE(st.st_mode), "04o"),
            "perms": mode_string(st.st_mode),
            "owner": user_name(st.st_uid),
            "group": group_name(st.st_gid),
        }
        if stat.S_ISLNK(st.st_mode):
            info["type"] = "link"
            try:
                info["target"] = os.readlink(full)
            except OSError:
                info["target"] = ""
            try:
                tst = os.stat(full)
                info["target_type"] = "dir" if stat.S_ISDIR(tst.st_mode) else "file"
                if not stat.S_ISDIR(tst.st_mode):
                    info["size"] = tst.st_size
            except OSError:
                info["target_type"] = "broken"
        elif stat.S_ISDIR(st.st_mode):
            info["type"] = "dir"
        elif stat.S_ISREG(st.st_mode):
            info["type"] = "file"
        else:
            info["type"] = "special"
        return info

    def unique_name(self, directory, name, suffix_word="copy"):
        base, ext = name, ""
        if not os.path.isdir(os.path.join(directory, name)):
            for archive_ext in ARCHIVE_SUFFIXES:
                if name.lower().endswith(archive_ext) and len(name) > len(archive_ext):
                    base, ext = name[: -len(archive_ext)], name[-len(archive_ext):]
                    break
            else:
                base, ext = os.path.splitext(name)
                if not base:
                    base, ext = name, ""
        candidate = f"{base} ({suffix_word}){ext}" if suffix_word else name
        counter = 2
        while os.path.lexists(os.path.join(directory, candidate)):
            label = f"{suffix_word} {counter}" if suffix_word else str(counter)
            candidate = f"{base} ({label}){ext}"
            counter += 1
        return candidate


def valid_name(name):
    if not isinstance(name, str) or name in ("", ".", "..") or "/" in name or "\x00" in name:
        raise ApiError(400, "Invalid name")
    if len(name.encode("utf-8", "surrogateescape")) > 255:
        raise ApiError(400, "Name is too long")
    return name


def is_special(path):
    try:
        mode = os.lstat(path).st_mode
    except OSError:
        return False
    return not (stat.S_ISREG(mode) or stat.S_ISDIR(mode) or stat.S_ISLNK(mode))


def ignore_special(directory, names):
    return [n for n in names if is_special(os.path.join(directory, n))]


def is_within(path, parent):
    path = os.path.realpath(path)
    parent = os.path.realpath(parent)
    return path == parent or path.startswith(parent.rstrip(os.sep) + os.sep)


def content_disposition(filename, inline=False):
    ascii_name = filename.encode("ascii", "replace").decode("ascii").replace('"', "_").replace("?", "_")
    kind = "inline" if inline else "attachment"
    return f"{kind}; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(filename, safe='')}"


class _ZipStream:
    """Minimal write-only, non-seekable file object for streaming zips."""

    def __init__(self, raw):
        self.raw = raw

    def write(self, data):
        self.raw.write(data)
        return len(data)

    def flush(self):
        self.raw.flush()


def safe_tar_members(tar, dest):
    """Fallback member filter for Python builds without tarfile filters."""
    dest = os.path.realpath(dest)
    for member in tar.getmembers():
        name = member.name
        target = os.path.realpath(os.path.join(dest, name))
        if name.startswith("/") or not (target == dest or target.startswith(dest + os.sep)):
            log.warning("Skipping unsafe archive member %s", name)
            continue
        if member.issym() or member.islnk():
            link_target = os.path.realpath(os.path.join(os.path.dirname(target), member.linkname))
            if member.linkname.startswith("/") or not link_target.startswith(dest + os.sep):
                log.warning("Skipping archive link pointing outside: %s", name)
                continue
        if member.isdev() or member.isfifo():
            continue
        member.mode &= 0o777
        yield member


class Api:
    def __init__(self, fs, terminal=None):
        self.fs = fs
        self.terminal = terminal or TerminalManager(enabled=False)

    # ---- read-only ---------------------------------------------------------

    def info(self, req):
        return {
            "user": req.user,
            "version": VERSION,
            "root": self.fs.root,
            "full_access": self.fs.is_root_user,
            "inherit_owner": self.fs.inherit_owner,
            "hostname": socket.gethostname(),
            "running_as": user_name(os.geteuid()),
            "max_edit_size": MAX_EDIT_SIZE,
            "terminal": self.terminal.enabled,
            "terminal_mode": self.terminal.mode,
        }

    def list(self, req):
        real, vpath = self.fs.resolve(req.arg("path", "/"))
        if not os.path.isdir(real):
            raise ApiError(400, f"Not a folder ({vpath})")
        entries = []
        errors = 0
        with os.scandir(real) as it:
            for de in it:
                try:
                    entries.append(self.fs.entry(real, de.name))
                except OSError:
                    errors += 1
        result = {"path": vpath, "entries": entries, "unreadable": errors,
                  "writable": os.access(real, os.W_OK)}
        try:
            usage = shutil.disk_usage(real)
            result["disk"] = {"total": usage.total, "used": usage.used, "free": usage.free}
        except OSError:
            pass
        return result

    def tree(self, req):
        """Sub-folders only, for the folder tree."""
        real, vpath = self.fs.resolve(req.arg("path", "/"))
        dirs = []
        with os.scandir(real) as it:
            for de in it:
                try:
                    if de.is_dir(follow_symlinks=True):
                        dirs.append({"name": de.name, "link": de.is_symlink()})
                except OSError:
                    pass
        dirs.sort(key=lambda d: d["name"].lower())
        return {"path": vpath, "dirs": dirs}

    def stat(self, req):
        real, vpath = self.fs.resolve(req.arg("path"), follow=False)
        if not os.path.lexists(real):
            return {"path": vpath, "exists": False}
        item = self.fs.entry(os.path.dirname(real), os.path.basename(real))
        item.update({"path": vpath, "exists": True})
        return item

    def read(self, req):
        real, vpath = self.fs.resolve(req.arg("path"))
        st = os.stat(real)
        if not stat.S_ISREG(st.st_mode):
            raise ApiError(400, "Only regular files can be edited")
        if st.st_size > MAX_EDIT_SIZE:
            raise ApiError(413, f"File is too large to be edited online "
                                f"(limit {MAX_EDIT_SIZE // (1024 * 1024)} MiB). Download it instead.")
        with open(real, "rb") as f:
            raw = f.read(MAX_EDIT_SIZE + 1)
        if len(raw) > MAX_EDIT_SIZE:
            raise ApiError(413, "File is too large to be edited online")
        if b"\x00" in raw[:8192]:
            raise ApiError(415, "This looks like a binary file, it can't be edited as text",
                           code="binary")
        if raw.startswith(codecs.BOM_UTF8):
            encoding = "utf-8-sig"
        else:
            encoding = "utf-8"
        try:
            text = raw.decode(encoding)
        except UnicodeDecodeError:
            encoding = "latin-1"
            text = raw.decode(encoding)
        eol = "crlf" if text.count("\r\n") > 0 and text.count("\r\n") >= text.count("\n") / 2 else "lf"
        if eol == "crlf":
            text = text.replace("\r\n", "\n")
        return {
            "path": vpath,
            "content": text,
            "encoding": encoding,
            "eol": eol,
            "mtime_ns": str(st.st_mtime_ns),
            "size": st.st_size,
            "writable": os.access(real, os.W_OK),
        }

    def search(self, req):
        real, vpath = self.fs.resolve(req.arg("path", "/"))
        query = req.arg("q", "").strip()
        if not query:
            raise ApiError(400, "Missing search text")
        pattern = query.lower()
        use_glob = any(c in pattern for c in "*?[")
        results = []
        started = time.monotonic()
        truncated = False
        for dirpath, dirnames, filenames in os.walk(real, followlinks=False):
            if self.fs.root == "/":
                dirnames[:] = [d for d in dirnames
                               if os.path.join(dirpath, d) not in SEARCH_SKIP_DIRS]
            for name in dirnames + filenames:
                low = name.lower()
                if (fnmatch.fnmatchcase(low, pattern) if use_glob else pattern in low):
                    try:
                        item = self.fs.entry(dirpath, name)
                    except OSError:
                        continue
                    item["dir"] = self.fs.to_virtual(dirpath)
                    results.append(item)
                    if len(results) >= SEARCH_MAX_RESULTS:
                        truncated = True
                        break
            if truncated or time.monotonic() - started > SEARCH_MAX_SECONDS:
                truncated = True
                break
        return {"path": vpath, "query": query, "results": results, "truncated": truncated}

    # ---- modifications -----------------------------------------------------

    def write(self, req):
        body = req.json()
        real, vpath = self.fs.resolve(body.get("path"))
        content = body.get("content")
        if not isinstance(content, str):
            raise ApiError(400, "Missing content")
        encoding = body.get("encoding") or "utf-8"
        if encoding not in ("utf-8", "utf-8-sig", "latin-1"):
            raise ApiError(400, "Unsupported encoding")
        if body.get("eol") == "crlf":
            content = content.replace("\r\n", "\n").replace("\n", "\r\n")
        try:
            data = content.encode(encoding)
        except UnicodeEncodeError:
            raise ApiError(400, "The text contains characters that can't be saved in this "
                                "file's encoding (latin-1)")

        target = os.path.realpath(real)
        self.fs.check_contained(target)
        exists = os.path.lexists(target)
        if exists:
            st = os.stat(target)
            if not stat.S_ISREG(st.st_mode):
                raise ApiError(400, "Only regular files can be edited")
            expected = body.get("expected_mtime_ns")
            if expected and str(st.st_mtime_ns) != str(expected) and not body.get("force"):
                raise ApiError(409, "The file was modified by someone else since you opened it",
                               code="modified")
        elif not body.get("create"):
            raise ApiError(404, f"No such file ({vpath})")

        directory = os.path.dirname(target)
        try:
            fd, tmp = tempfile.mkstemp(dir=directory, prefix=".sm-edit-")
        except PermissionError:
            # The folder isn't writable but the file may be: write in place.
            if not exists:
                raise
            with open(target, "r+b") as f:
                f.write(data)
                f.truncate()
            new_st = os.stat(target)
            req.audit("edit", vpath)
            return {"path": vpath, "mtime_ns": str(new_st.st_mtime_ns), "size": new_st.st_size}
        try:
            with os.fdopen(fd, "wb") as f:
                f.write(data)
                f.flush()
                os.fsync(f.fileno())
            if exists:
                os.chmod(tmp, stat.S_IMODE(st.st_mode))
                if self.fs.is_root_user:
                    os.chown(tmp, st.st_uid, st.st_gid)
            else:
                os.chmod(tmp, self.fs.new_file_mode())
            os.replace(tmp, target)
        except BaseException:
            try:
                os.unlink(tmp)
            except OSError:
                pass
            raise
        if not exists:
            self.fs.adopt(target)
        new_st = os.stat(target)
        req.audit("edit", vpath)
        return {"path": vpath, "mtime_ns": str(new_st.st_mtime_ns), "size": new_st.st_size}

    def mkdir(self, req):
        body = req.json()
        real, vpath = self.fs.resolve(body.get("path"), follow=False)
        valid_name(os.path.basename(real))
        os.mkdir(real)
        self.fs.adopt(real)
        req.audit("mkdir", vpath)
        return {"path": vpath}

    def touch(self, req):
        body = req.json()
        real, vpath = self.fs.resolve(body.get("path"), follow=False)
        valid_name(os.path.basename(real))
        fd = os.open(real, os.O_WRONLY | os.O_CREAT | os.O_EXCL, self.fs.new_file_mode())
        os.close(fd)
        self.fs.adopt(real)
        req.audit("create", vpath)
        return {"path": vpath}

    def rename(self, req):
        body = req.json()
        real, vpath = self.fs.resolve(body.get("path"), follow=False)
        name = valid_name(body.get("name"))
        self.fs.check_not_protected(real, vpath)
        if not os.path.lexists(real):
            raise ApiError(404, f"No such file or folder ({vpath})")
        dest = os.path.join(os.path.dirname(real), name)
        if dest == real:
            return {"path": vpath}
        if os.path.lexists(dest) and os.path.normcase(dest) != os.path.normcase(real):
            raise ApiError(409, f"“{name}” already exists", code="exists")
        os.rename(real, dest)
        new_vpath = self.fs.to_virtual(dest)
        req.audit("rename", f"{vpath} -> {new_vpath}")
        return {"path": new_vpath}

    def _sources(self, body, follow=False):
        paths = body.get("paths")
        if not isinstance(paths, list) or not paths:
            raise ApiError(400, "No files selected")
        out = []
        for p in paths:
            real, vpath = self.fs.resolve(p, follow=follow)
            if not os.path.lexists(real):
                raise ApiError(404, f"No such file or folder ({vpath})")
            out.append((real, vpath))
        return out

    def _dest_dir(self, body):
        dest, dest_v = self.fs.resolve(body.get("dest"))
        if not os.path.isdir(dest):
            raise ApiError(400, f"Destination is not a folder ({dest_v})")
        return dest, dest_v

    def _conflicts(self, sources, dest):
        return [os.path.basename(real) for real, _ in sources
                if os.path.lexists(os.path.join(dest, os.path.basename(real)))
                and os.path.join(dest, os.path.basename(real)) != real]

    def move(self, req):
        body = req.json()
        sources = self._sources(body)
        dest, dest_v = self._dest_dir(body)
        overwrite = bool(body.get("overwrite"))
        for real, vpath in sources:
            self.fs.check_not_protected(real, vpath)
            if os.path.isdir(real) and not os.path.islink(real) and is_within(dest, real):
                raise ApiError(400, f"Can't move a folder into itself ({vpath})")
        conflicts = self._conflicts(sources, dest)
        if conflicts and not overwrite:
            raise ApiError(409, "Some items already exist in the destination",
                           code="conflict", extra={"conflicts": conflicts})
        done, errors = 0, []
        for real, vpath in sources:
            target = os.path.join(dest, os.path.basename(real))
            if target == real:
                continue
            try:
                if os.path.lexists(target):
                    if os.path.isdir(target) and not os.path.islink(target):
                        raise ApiError(409, "A folder with the same name already exists "
                                            "in the destination")
                    os.unlink(target)
                shutil.move(real, target)
                done += 1
                req.audit("move", f"{vpath} -> {self.fs.to_virtual(target)}")
            except Exception as exc:  # noqa: BLE001 - reported per item
                errors.append({"path": vpath, "error": os_error_to_api(exc, vpath).message})
        return {"done": done, "errors": errors}

    def copy(self, req):
        body = req.json()
        sources = self._sources(body)
        dest, dest_v = self._dest_dir(body)
        conflict = body.get("conflict", "error")
        if conflict not in ("error", "overwrite", "rename"):
            raise ApiError(400, "Invalid conflict policy")
        for real, vpath in sources:
            if os.path.isdir(real) and not os.path.islink(real) and is_within(dest, real):
                raise ApiError(400, f"Can't copy a folder into itself ({vpath})")
        if conflict == "error":
            conflicts = self._conflicts(sources, dest)
            if conflicts:
                raise ApiError(409, "Some items already exist in the destination",
                               code="conflict", extra={"conflicts": conflicts})
        done, errors = 0, []
        for real, vpath in sources:
            name = os.path.basename(real)
            target = os.path.join(dest, name)
            try:
                if os.path.lexists(target) and (conflict == "rename" or target == real):
                    target = os.path.join(dest, self.fs.unique_name(dest, name))
                if os.path.islink(real):
                    if os.path.lexists(target):
                        if os.path.isdir(target) and not os.path.islink(target):
                            raise ApiError(409, "A folder with the same name already exists")
                        os.unlink(target)
                    os.symlink(os.readlink(real), target)
                elif os.path.isdir(real):
                    if os.path.lexists(target) and not os.path.isdir(target):
                        raise ApiError(409, "A file with the same name already exists")
                    shutil.copytree(real, target, symlinks=True, ignore=ignore_special,
                                    dirs_exist_ok=True)
                elif os.path.isfile(real):
                    if os.path.isdir(target) and not os.path.islink(target):
                        raise ApiError(409, "A folder with the same name already exists")
                    shutil.copy2(real, target)
                else:
                    raise ApiError(400, "Special files can't be copied")
                self.fs.adopt(target, recursive=True)
                done += 1
                req.audit("copy", f"{vpath} -> {self.fs.to_virtual(target)}")
            except Exception as exc:  # noqa: BLE001 - reported per item
                errors.append({"path": vpath, "error": os_error_to_api(exc, vpath).message})
        return {"done": done, "errors": errors}

    def delete(self, req):
        body = req.json()
        sources = self._sources(body)
        for real, vpath in sources:
            self.fs.check_not_protected(real, vpath)
        done, errors = 0, []
        for real, vpath in sources:
            try:
                if os.path.isdir(real) and not os.path.islink(real):
                    shutil.rmtree(real)
                else:
                    os.unlink(real)
                done += 1
                req.audit("delete", vpath)
            except Exception as exc:  # noqa: BLE001 - reported per item
                errors.append({"path": vpath, "error": os_error_to_api(exc, vpath).message})
        return {"done": done, "errors": errors}

    def chmod(self, req):
        body = req.json()
        sources = self._sources(body)
        mode_str = str(body.get("mode", ""))
        if not mode_str.isdigit() or len(mode_str) not in (3, 4) or any(c > "7" for c in mode_str):
            raise ApiError(400, "Invalid permissions, use an octal value like 644 or 0755")
        mode = int(mode_str, 8)
        recursive = bool(body.get("recursive"))
        apply_to = body.get("apply_to", "all")
        if apply_to not in ("all", "files", "dirs"):
            raise ApiError(400, "Invalid 'apply_to' value")

        def wanted(path):
            if os.path.islink(path):
                return False
            if apply_to == "files":
                return os.path.isfile(path)
            if apply_to == "dirs":
                return os.path.isdir(path)
            return True

        done, errors = 0, []
        for real, vpath in sources:
            try:
                if os.path.islink(real):
                    raise ApiError(400, "Permissions of a symbolic link can't be changed")
                if wanted(real) or not recursive:
                    os.chmod(real, mode)
                    done += 1
                if recursive and os.path.isdir(real):
                    for dirpath, dirnames, filenames in os.walk(real):
                        for name in dirnames + filenames:
                            p = os.path.join(dirpath, name)
                            if wanted(p):
                                os.chmod(p, mode)
                                done += 1
                req.audit("chmod", f"{mode_str} {vpath}{' (recursive)' if recursive else ''}")
            except Exception as exc:  # noqa: BLE001 - reported per item
                errors.append({"path": vpath, "error": os_error_to_api(exc, vpath).message})
        return {"done": done, "errors": errors}

    def chown(self, req):
        if not self.fs.is_root_user:
            raise ApiError(403, "Changing the owner requires the app to run with full access")
        body = req.json()
        sources = self._sources(body)
        owner = str(body.get("owner") or "").strip()
        group = str(body.get("group") or "").strip()
        uid = gid = -1
        try:
            if owner:
                uid = int(owner) if owner.isdigit() else pwd.getpwnam(owner).pw_uid
            if group:
                gid = int(group) if group.isdigit() else grp.getgrnam(group).gr_gid
        except KeyError:
            raise ApiError(400, "Unknown user or group")
        if uid == -1 and gid == -1:
            raise ApiError(400, "Nothing to change")
        recursive = bool(body.get("recursive"))
        done, errors = 0, []
        for real, vpath in sources:
            try:
                os.lchown(real, uid, gid)
                done += 1
                if recursive and os.path.isdir(real) and not os.path.islink(real):
                    for dirpath, dirnames, filenames in os.walk(real):
                        for name in dirnames + filenames:
                            os.lchown(os.path.join(dirpath, name), uid, gid)
                            done += 1
                req.audit("chown", f"{owner or '-'}:{group or '-'} {vpath}"
                                   f"{' (recursive)' if recursive else ''}")
            except Exception as exc:  # noqa: BLE001 - reported per item
                errors.append({"path": vpath, "error": os_error_to_api(exc, vpath).message})
        return {"done": done, "errors": errors}

    def compress(self, req):
        body = req.json()
        sources = self._sources(body)
        dest, dest_v = self._dest_dir(body)
        name = valid_name(body.get("name") or "archive.zip")
        if not name.lower().endswith(".zip"):
            name += ".zip"
        target = os.path.join(dest, name)
        if os.path.lexists(target):
            raise ApiError(409, f"“{name}” already exists", code="exists")
        fd, tmp = tempfile.mkstemp(dir=dest, prefix=".sm-zip-")
        try:
            with os.fdopen(fd, "wb") as f:
                skipped = self._write_zip(f, sources)
            os.chmod(tmp, self.fs.new_file_mode())
            os.replace(tmp, target)
        except BaseException:
            try:
                os.unlink(tmp)
            except OSError:
                pass
            raise
        self.fs.adopt(target)
        req.audit("compress", f"{', '.join(v for _, v in sources)} -> {self.fs.to_virtual(target)}")
        return {"path": self.fs.to_virtual(target), "skipped": skipped}

    def extract(self, req):
        body = req.json()
        real, vpath = self.fs.resolve(body.get("path"))
        name = os.path.basename(real)
        lower = name.lower()
        for ext in ARCHIVE_SUFFIXES:
            if lower.endswith(ext):
                folder = name[: -len(ext)] or "extracted"
                break
        else:
            raise ApiError(400, "Unsupported archive type")
        parent = os.path.dirname(real)
        if os.path.lexists(os.path.join(parent, folder)):
            folder = self.fs.unique_name(parent, folder, suffix_word="")
        target = os.path.join(parent, folder)
        os.mkdir(target)
        try:
            if lower.endswith(".zip"):
                with zipfile.ZipFile(real) as zf:
                    # ZipFile.extractall sanitizes absolute and ".." paths.
                    zf.extractall(target)
            else:
                with tarfile.open(real) as tf:
                    if hasattr(tarfile, "data_filter"):
                        tf.extractall(target, filter="data")
                    else:
                        tf.extractall(target, members=safe_tar_members(tf, target))
        except (zipfile.BadZipFile, tarfile.TarError, EOFError) as exc:
            shutil.rmtree(target, ignore_errors=True)
            raise ApiError(400, f"Could not read archive: {exc}")
        except BaseException:
            shutil.rmtree(target, ignore_errors=True)
            raise
        self.fs.adopt(target, recursive=True)
        req.audit("extract", f"{vpath} -> {self.fs.to_virtual(target)}")
        return {"path": self.fs.to_virtual(target)}

    def upload(self, req):
        real, vpath = self.fs.resolve(req.arg("path"), follow=False)
        name = valid_name(os.path.basename(real))
        overwrite = req.arg("overwrite") == "1"
        parent = os.path.dirname(real)
        if req.arg("mkdirs") == "1" and not os.path.isdir(parent):
            # Create missing folders (folder upload), adopting ownership.
            missing = []
            p = parent
            while not os.path.lexists(p) and p != self.fs.root and p != "/":
                missing.append(p)
                p = os.path.dirname(p)
            for d in reversed(missing):
                self.fs.check_contained(d, follow=False)
                os.mkdir(d)
                self.fs.adopt(d)
        self.fs.check_contained(parent)
        if not os.path.isdir(parent):
            raise ApiError(400, "Destination folder does not exist")
        length = req.headers.get("Content-Length")
        if length is None or not length.isdigit():
            raise ApiError(411, "Content-Length required")
        length = int(length)
        existing = None
        if os.path.lexists(real):
            if not overwrite:
                req.discard_body(length)
                raise ApiError(409, f"“{name}” already exists", code="exists")
            existing = os.stat(real)
            if stat.S_ISDIR(existing.st_mode):
                req.discard_body(length)
                raise ApiError(409, f"A folder named “{name}” already exists")
            if os.path.islink(real):
                real = os.path.realpath(real)
                self.fs.check_contained(real)
                parent = os.path.dirname(real)

        fd, tmp = tempfile.mkstemp(dir=parent, prefix=".sm-upload-")
        try:
            with os.fdopen(fd, "wb") as f:
                remaining = length
                while remaining > 0:
                    chunk = req.rfile.read(min(CHUNK_SIZE, remaining))
                    if not chunk:
                        raise ApiError(400, "Upload interrupted")
                    f.write(chunk)
                    remaining -= len(chunk)
            if existing is not None:
                os.chmod(tmp, stat.S_IMODE(existing.st_mode))
                if self.fs.is_root_user:
                    os.chown(tmp, existing.st_uid, existing.st_gid)
            else:
                os.chmod(tmp, self.fs.new_file_mode())
            os.replace(tmp, real)
        except BaseException:
            try:
                os.unlink(tmp)
            except OSError:
                pass
            raise
        if existing is None:
            self.fs.adopt(real)
        req.audit("upload", f"{vpath} ({length} bytes)")
        return {"path": vpath, "size": length}

    # ---- downloads (streamed, handled by the request handler) -------------

    def _write_zip(self, fileobj, sources):
        skipped = []
        with zipfile.ZipFile(fileobj, "w", compression=zipfile.ZIP_DEFLATED,
                             compresslevel=6, allowZip64=True) as zf:
            for real, vpath in sources:
                base = os.path.dirname(real)
                if os.path.isdir(real) and not os.path.islink(real):
                    for dirpath, dirnames, filenames in os.walk(real, followlinks=False):
                        if self.fs.root == "/":
                            dirnames[:] = [d for d in dirnames
                                           if os.path.join(dirpath, d) not in SEARCH_SKIP_DIRS]
                        dirnames.sort()
                        arcdir = os.path.relpath(dirpath, base)
                        try:
                            zf.write(dirpath, arcdir + "/")
                        except OSError:
                            pass
                        for name in sorted(filenames):
                            full = os.path.join(dirpath, name)
                            if not os.path.isfile(full):
                                continue  # broken links, sockets, devices...
                            try:
                                zf.write(full, os.path.join(arcdir, name))
                            except OSError as exc:
                                skipped.append(f"{self.fs.to_virtual(full)}: {exc.strerror}")
                elif os.path.isfile(real):
                    try:
                        zf.write(real, os.path.basename(real))
                    except OSError as exc:
                        skipped.append(f"{vpath}: {exc.strerror}")
            if skipped:
                zf.writestr("SKIPPED-FILES.txt",
                            "These files could not be read and were skipped:\n\n"
                            + "\n".join(skipped) + "\n")
        return skipped


class Request:
    """Small helper wrapping the handler for the API methods."""

    def __init__(self, handler, user, query):
        self.handler = handler
        self.user = user
        self.query = query
        self.headers = handler.headers
        self.rfile = handler.rfile
        self._json = None

    def arg(self, name, default=None):
        values = self.query.get(name)
        return values[0] if values else default

    def args(self, name):
        return self.query.get(name, [])

    def json(self):
        if self._json is None:
            length = self.headers.get("Content-Length")
            if not length or not length.isdigit():
                raise ApiError(411, "Content-Length required")
            length = int(length)
            if length > MAX_JSON_BODY:
                raise ApiError(413, "Request too large")
            raw = self.rfile.read(length)
            try:
                data = json.loads(raw.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                raise ApiError(400, "Invalid JSON body")
            if not isinstance(data, dict):
                raise ApiError(400, "Invalid JSON body")
            self._json = data
        return self._json

    def discard_body(self, length):
        remaining = length
        while remaining > 0:
            chunk = self.rfile.read(min(CHUNK_SIZE, remaining))
            if not chunk:
                break
            remaining -= len(chunk)

    def audit(self, action, detail):
        log.info("user=%s action=%s %s", self.user, action, detail)


class Handler(BaseHTTPRequestHandler):
    server_version = "ServerManager/" + VERSION
    sys_version = ""
    protocol_version = "HTTP/1.0"

    api = None  # set at startup
    user_header = "YNH_USER"
    static_files = {}

    GET_ROUTES = {
        "/api/info": "info",
        "/api/list": "list",
        "/api/tree": "tree",
        "/api/read": "read",
        "/api/stat": "stat",
        "/api/search": "search",
    }
    POST_ROUTES = {
        "/api/write": "write",
        "/api/mkdir": "mkdir",
        "/api/touch": "touch",
        "/api/rename": "rename",
        "/api/move": "move",
        "/api/copy": "copy",
        "/api/delete": "delete",
        "/api/chmod": "chmod",
        "/api/chown": "chown",
        "/api/compress": "compress",
        "/api/extract": "extract",
    }

    def log_message(self, fmt, *args):  # silence default access log
        log.debug("%s - %s", self.address_string(), fmt % args)

    # ---- common ------------------------------------------------------------

    def _security_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("X-Frame-Options", "SAMEORIGIN")

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self._security_headers()
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def send_error_json(self, err):
        payload = {"error": err.message}
        if err.code:
            payload["code"] = err.code
        payload.update(err.extra)
        self.send_json(err.status, payload)

    def send_text_error(self, err):
        body = f"Download failed: {err.message}".encode("utf-8")
        self.send_response(err.status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self._security_headers()
        self.end_headers()
        self.wfile.write(body)

    def authenticated_user(self):
        user = self.headers.get(self.user_header, "").strip()
        if not user:
            raise ApiError(401, "Not authenticated. This app must be accessed through the "
                                "YunoHost single sign-on.")
        return user

    def same_origin(self):
        origin = self.headers.get("Origin")
        if not origin:
            return None
        origin_host = urlsplit(origin).hostname or ""
        host = (self.headers.get("Host") or "").split(":")[0]
        return origin_host.lower() == host.lower()

    def check_csrf(self):
        if self.headers.get("X-Requested-With") != "ServerManager":
            raise ApiError(403, "Missing request header")
        if self.same_origin() is False:
            raise ApiError(403, "Cross-origin request refused")

    def dispatch(self, method):
        url = urlsplit(self.path)
        path = url.path
        query = parse_qs(url.query, keep_blank_values=True)
        try:
            user = self.authenticated_user()
            if method in ("GET", "HEAD") and not path.startswith("/api/"):
                return self.serve_static(path)
            if method == "POST":
                self.check_csrf()
                route = self.POST_ROUTES.get(path)
            elif method == "PUT" and path == "/api/upload":
                self.check_csrf()
                route = "upload"
            elif method == "GET" and path == "/api/download":
                try:
                    return self.serve_download(Request(self, user, query))
                except (BrokenPipeError, ConnectionResetError):
                    raise
                except Exception as exc:  # noqa: BLE001 - shown in the download iframe
                    return self.send_text_error(os_error_to_api(exc))
            elif method == "GET" and path == "/api/raw":
                return self.serve_raw(Request(self, user, query))
            elif method == "GET" and path == "/api/terminal":
                return self.serve_terminal(Request(self, user, query))
            elif method in ("GET", "HEAD"):
                route = self.GET_ROUTES.get(path)
            else:
                route = None
            if route is None:
                raise ApiError(404, "Not found")
            req = Request(self, user, query)
            result = getattr(self.api, route)(req)
            self.send_json(200, result)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as exc:  # noqa: BLE001 - converted to an HTTP error
            err = os_error_to_api(exc)
            if err.status >= 500 and not isinstance(exc, (ApiError, OSError)):
                log.exception("Unexpected error on %s %s", method, path)
            try:
                self.send_error_json(err)
            except (BrokenPipeError, ConnectionResetError):
                pass

    def do_GET(self):
        self.dispatch("GET")

    def do_HEAD(self):
        self.dispatch("HEAD")

    def do_POST(self):
        self.dispatch("POST")

    def do_PUT(self):
        self.dispatch("PUT")

    # ---- static files ------------------------------------------------------

    def serve_static(self, path):
        name = "index.html" if path in ("", "/") else path.lstrip("/")
        if name.startswith("static/"):
            name = name[len("static/"):]
        entry = self.static_files.get(name)
        if entry is None:
            raise ApiError(404, "Not found")
        data, ctype = entry
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self._security_headers()
        if name == "index.html":
            # Some browsers (older Safari) don't match WebSockets with 'self'.
            host = self.headers.get("Host") or ""
            ws = f" wss://{host} ws://{host}" if host and all(c.isalnum() or c in ".-:[]" for c in host) else ""
            # 'unsafe-inline' styles are needed by the terminal emulator (xterm.js)
            self.send_header(
                "Content-Security-Policy",
                "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; "
                f"script-src 'self'; connect-src 'self'{ws}; object-src 'none'; "
                "base-uri 'none'; form-action 'self'; frame-ancestors 'self'")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    @classmethod
    def load_static(cls):
        files = {}
        for dirpath, _, filenames in os.walk(STATIC_DIR):
            for filename in filenames:
                full = os.path.join(dirpath, filename)
                name = os.path.relpath(full, STATIC_DIR).replace(os.sep, "/")
                ctype = mimetypes.guess_type(name)[0] or "application/octet-stream"
                if ctype.startswith("text/") or ctype in ("application/javascript", "image/svg+xml"):
                    ctype += "; charset=utf-8"
                with open(full, "rb") as f:
                    files[name] = (f.read(), ctype)
        cls.static_files = files

    # ---- downloads ---------------------------------------------------------

    def serve_download(self, req):
        paths = req.args("path")
        if not paths:
            raise ApiError(400, "Missing path")
        sources = []
        for p in paths:
            real, vpath = self.api.fs.resolve(p)
            if not os.path.exists(real):
                raise ApiError(404, f"No such file or folder ({vpath})")
            sources.append((real, vpath))

        if len(sources) == 1 and os.path.isfile(sources[0][0]):
            real, vpath = sources[0]
            with open(real, "rb") as f:
                size = os.fstat(f.fileno()).st_size
                self.send_response(200)
                self.send_header("Content-Type", "application/octet-stream")
                self.send_header("Content-Length", str(size))
                self.send_header("Content-Disposition", content_disposition(os.path.basename(real)))
                self.send_header("Cache-Control", "no-store")
                self._security_headers()
                self.end_headers()
                shutil.copyfileobj(f, self.wfile, CHUNK_SIZE)
            req.audit("download", vpath)
            return

        for real, vpath in sources:
            if not (os.path.isfile(real) or os.path.isdir(real)):
                raise ApiError(400, f"Can't download special file ({vpath})")
        if len(sources) == 1:
            zip_name = (os.path.basename(sources[0][0]) or self.api.fs.root.strip("/") or "root") + ".zip"
        else:
            parent = os.path.basename(os.path.dirname(sources[0][0])) or "files"
            zip_name = parent + ".zip"
        self.send_response(200)
        self.send_header("Content-Type", "application/zip")
        self.send_header("Content-Disposition", content_disposition(zip_name))
        self.send_header("Cache-Control", "no-store")
        self._security_headers()
        self.end_headers()
        self.close_connection = True
        try:
            self.api._write_zip(_ZipStream(self.wfile), sources)
        except (BrokenPipeError, ConnectionResetError):
            return
        except Exception:  # noqa: BLE001 - headers are already sent
            log.exception("Error while streaming zip archive")
            return
        req.audit("download", ", ".join(v for _, v in sources) + " (zip)")

    # ---- terminal ----------------------------------------------------------

    def serve_terminal(self, req):
        terminal = self.api.terminal
        if not terminal.enabled:
            raise ApiError(403, "The terminal is disabled in the app configuration")
        key = self.headers.get("Sec-WebSocket-Key")
        if self.headers.get("Upgrade", "").lower() != "websocket" or not key:
            raise ApiError(400, "WebSocket connection expected")
        # Browsers send cookies with WebSockets from any site: the origin must match.
        if not self.same_origin():
            raise ApiError(403, "Cross-origin request refused")
        real, vpath = self.api.fs.resolve(req.arg("cwd", "/"))
        if not os.path.isdir(real):
            real, vpath = self.api.fs.root, "/"
        rows = clamp(req.arg("rows"), 2, 500, 24)
        cols = clamp(req.arg("cols"), 2, 1000, 80)
        try:
            session = terminal.open(req.user, real, rows, cols)
        except TerminalError as exc:
            raise ApiError(503, str(exc))
        self.wfile.write((
            "HTTP/1.1 101 Switching Protocols\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Accept: {accept_key(key)}\r\n\r\n").encode("ascii"))
        self.close_connection = True
        req.audit("terminal-open", f"session {session.id} in {vpath}")
        terminal.run(WebSocket(self.rfile, self.connection), session)
        req.audit("terminal-close", f"session {session.id} after "
                                    f"{int(time.monotonic() - session.started)}s")

    def serve_raw(self, req):
        real, vpath = self.api.fs.resolve(req.arg("path"))
        ext = os.path.splitext(real)[1].lower()
        ctype = PREVIEW_TYPES.get(ext)
        if ctype is None:
            raise ApiError(415, "Preview is not available for this type of file")
        with open(real, "rb") as f:
            st = os.fstat(f.fileno())
            if not stat.S_ISREG(st.st_mode):
                raise ApiError(400, "Not a regular file")
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(st.st_size))
            self.send_header("Content-Disposition", content_disposition(os.path.basename(real), inline=True))
            self.send_header("Content-Security-Policy", "default-src 'none'; sandbox")
            self.send_header("Cache-Control", "no-store")
            self._security_headers()
            self.end_headers()
            shutil.copyfileobj(f, self.wfile, CHUNK_SIZE)


def main():
    logging.basicConfig(level=os.environ.get("SM_LOG_LEVEL", "INFO"),
                        format="%(asctime)s %(levelname)s %(message)s",
                        stream=sys.stdout)
    root = os.environ.get("SM_ROOT", "/")
    host = os.environ.get("SM_HOST", "127.0.0.1")
    port = int(os.environ.get("SM_PORT", "8080"))
    inherit_owner = os.environ.get("SM_INHERIT_OWNER", "1") not in ("0", "false", "False", "")
    terminal = TerminalManager(
        enabled=os.environ.get("SM_TERMINAL", "1") not in ("0", "false", "False", ""),
        mode=os.environ.get("SM_TERMINAL_MODE", "auto"))

    if not os.path.isdir(root):
        log.error("Root folder %s does not exist", root)
        sys.exit(1)

    Handler.api = Api(FileSystem(root, inherit_owner=inherit_owner), terminal)
    Handler.user_header = os.environ.get("SM_USER_HEADER", "YNH_USER")
    Handler.load_static()

    server = ThreadingHTTPServer((host, port), Handler)
    server.daemon_threads = True
    log.info("Server Manager %s listening on %s:%s, managing %s as %s (terminal: %s)",
             VERSION, host, port, Handler.api.fs.root, user_name(os.geteuid()),
             terminal.mode if terminal.enabled else "disabled")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
