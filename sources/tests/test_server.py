"""Integration tests for the Server Manager backend.

Run with:  python3 -m unittest discover -s sources/tests -v
"""

import http.client
import io
import json
import os
import shutil
import sys
import tarfile
import tempfile
import threading
import unittest
import zipfile
from http.server import ThreadingHTTPServer
from urllib.parse import urlencode

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import server  # noqa: E402


class ServerTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix="sm-test-")
        cls.root = os.path.join(cls.tmp, "root")
        cls.outside = os.path.join(cls.tmp, "outside")
        os.mkdir(cls.root)
        os.mkdir(cls.outside)
        with open(os.path.join(cls.outside, "secret.txt"), "w") as f:
            f.write("secret")
        server.Handler.api = server.Api(server.FileSystem(cls.root))
        server.Handler.load_static()
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        cls.httpd.daemon_threads = True
        cls.port = cls.httpd.server_address[1]
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        shutil.rmtree(cls.tmp)

    def setUp(self):
        for name in os.listdir(self.root):
            p = os.path.join(self.root, name)
            if os.path.isdir(p) and not os.path.islink(p):
                shutil.rmtree(p)
            else:
                os.unlink(p)

    # ---- helpers -------------------------------------------------------

    def request(self, method, path, params=None, body=None, headers=None, user="alice", raw=False):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        url = path + ("?" + urlencode(params, doseq=True) if params else "")
        hdrs = {"Host": "example.org"}
        if user:
            hdrs["YNH_USER"] = user
        if method in ("POST", "PUT"):
            hdrs["X-Requested-With"] = "ServerManager"
        if isinstance(body, dict):
            body = json.dumps(body).encode()
            hdrs["Content-Type"] = "application/json"
        hdrs.update(headers or {})
        conn.request(method, url, body=body, headers=hdrs)
        res = conn.getresponse()
        data = res.read()
        conn.close()
        if raw:
            return res, data
        return res.status, (json.loads(data) if data and "json" in res.getheader("Content-Type", "") else data)

    def get(self, endpoint, **params):
        return self.request("GET", "/api/" + endpoint, params=params)

    def post(self, endpoint, body):
        return self.request("POST", "/api/" + endpoint, body=body)

    def upload(self, path, content, **params):
        params = dict(params, path=path)
        return self.request("PUT", "/api/upload", params=params, body=content)

    def write_file(self, rel, content):
        full = os.path.join(self.root, rel)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "wb") as f:
            f.write(content if isinstance(content, bytes) else content.encode())
        return full

    # ---- auth & csrf ---------------------------------------------------

    def test_requires_user_header(self):
        status, data = self.request("GET", "/api/list", params={"path": "/"}, user=None)
        self.assertEqual(status, 401)
        status, _ = self.request("GET", "/", user=None)
        self.assertEqual(status, 401)

    def test_post_requires_csrf_header(self):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        conn.request("POST", "/api/mkdir", body=json.dumps({"path": "/x"}),
                     headers={"YNH_USER": "alice", "Content-Type": "application/json"})
        self.assertEqual(conn.getresponse().status, 403)
        conn.close()
        self.assertFalse(os.path.exists(os.path.join(self.root, "x")))

    def test_post_rejects_foreign_origin(self):
        status, _ = self.request("POST", "/api/mkdir", body={"path": "/x"},
                                 headers={"Origin": "https://evil.example"})
        self.assertEqual(status, 403)
        status, _ = self.request("POST", "/api/mkdir", body={"path": "/x"},
                                 headers={"Origin": "https://example.org"})
        self.assertEqual(status, 200)

    def test_static_index(self):
        res, data = self.request("GET", "/", raw=True)
        self.assertEqual(res.status, 200)
        self.assertIn(b"Server Manager", data)
        self.assertIn("script-src 'self'", res.getheader("Content-Security-Policy"))
        res, _ = self.request("GET", "/static/app.js", raw=True)
        self.assertEqual(res.status, 200)
        res, _ = self.request("GET", "/static/../server.py", raw=True)
        self.assertEqual(res.status, 404)

    def test_info(self):
        status, data = self.get("info")
        self.assertEqual(status, 200)
        self.assertEqual(data["user"], "alice")
        self.assertEqual(data["root"], os.path.realpath(self.root))

    # ---- listing & paths -----------------------------------------------

    def test_list(self):
        self.write_file("a.txt", "hello")
        os.mkdir(os.path.join(self.root, "dir"))
        os.symlink("a.txt", os.path.join(self.root, "link"))
        status, data = self.get("list", path="/")
        self.assertEqual(status, 200)
        by_name = {e["name"]: e for e in data["entries"]}
        self.assertEqual(by_name["a.txt"]["type"], "file")
        self.assertEqual(by_name["a.txt"]["size"], 5)
        self.assertEqual(by_name["dir"]["type"], "dir")
        self.assertEqual(by_name["link"]["type"], "link")
        self.assertEqual(by_name["link"]["target_type"], "file")
        self.assertIn("disk", data)

    def test_dotdot_cannot_escape_root(self):
        status, data = self.get("list", path="/../../..")
        self.assertEqual(status, 200)
        self.assertEqual(data["path"], "/")
        status, _ = self.get("read", path="/../outside/secret.txt")
        self.assertEqual(status, 404)

    def test_symlink_cannot_escape_root(self):
        os.symlink(self.outside, os.path.join(self.root, "escape"))
        status, data = self.get("list", path="/escape")
        self.assertEqual(status, 403)
        status, _ = self.get("read", path="/escape/secret.txt")
        self.assertEqual(status, 403)
        status, _ = self.upload("/escape/new.txt", b"x")
        self.assertEqual(status, 403)
        self.assertFalse(os.path.exists(os.path.join(self.outside, "new.txt")))
        res, _ = self.request("GET", "/api/download", params={"path": "/escape/secret.txt"}, raw=True)
        self.assertEqual(res.status, 403)
        # The link itself can still be deleted, without touching its target
        status, _ = self.post("delete", {"paths": ["/escape"]})
        self.assertEqual(status, 200)
        self.assertTrue(os.path.exists(os.path.join(self.outside, "secret.txt")))

    def test_stat(self):
        self.write_file("a.txt", "x")
        self.assertTrue(self.get("stat", path="/a.txt")[1]["exists"])
        self.assertFalse(self.get("stat", path="/nope")[1]["exists"])

    # ---- editing -------------------------------------------------------

    def test_read_write_roundtrip(self):
        self.write_file("conf.ini", "a=1\nb=2\n")
        status, data = self.get("read", path="/conf.ini")
        self.assertEqual(status, 200)
        self.assertEqual(data["content"], "a=1\nb=2\n")
        self.assertEqual(data["eol"], "lf")
        status, res = self.post("write", {"path": "/conf.ini", "content": "a=3\n",
                                          "encoding": data["encoding"], "eol": data["eol"],
                                          "expected_mtime_ns": data["mtime_ns"]})
        self.assertEqual(status, 200)
        with open(os.path.join(self.root, "conf.ini")) as f:
            self.assertEqual(f.read(), "a=3\n")

    def test_write_preserves_mode(self):
        full = self.write_file("script.sh", "echo hi\n")
        os.chmod(full, 0o750)
        _, data = self.get("read", path="/script.sh")
        self.post("write", {"path": "/script.sh", "content": "echo bye\n",
                            "expected_mtime_ns": data["mtime_ns"]})
        self.assertEqual(os.stat(full).st_mode & 0o777, 0o750)

    def test_write_detects_concurrent_change(self):
        full = self.write_file("f.txt", "one")
        _, data = self.get("read", path="/f.txt")
        os.utime(full, ns=(1, 1))
        status, res = self.post("write", {"path": "/f.txt", "content": "two",
                                          "expected_mtime_ns": data["mtime_ns"]})
        self.assertEqual(status, 409)
        self.assertEqual(res["code"], "modified")
        status, _ = self.post("write", {"path": "/f.txt", "content": "two",
                                        "expected_mtime_ns": data["mtime_ns"], "force": True})
        self.assertEqual(status, 200)

    def test_crlf_bom_and_latin1(self):
        full = self.write_file("win.txt", b"\xef\xbb\xbfline1\r\nline2\r\n")
        _, data = self.get("read", path="/win.txt")
        self.assertEqual(data["eol"], "crlf")
        self.assertEqual(data["encoding"], "utf-8-sig")
        self.assertEqual(data["content"], "line1\nline2\n")
        self.post("write", {"path": "/win.txt", "content": data["content"] + "line3\n",
                            "encoding": data["encoding"], "eol": data["eol"]})
        with open(full, "rb") as f:
            self.assertEqual(f.read(), b"\xef\xbb\xbfline1\r\nline2\r\nline3\r\n")

        full = self.write_file("latin.txt", "caf\xe9\n".encode("latin-1"))
        _, data = self.get("read", path="/latin.txt")
        self.assertEqual(data["encoding"], "latin-1")
        self.assertEqual(data["content"], "caf\xe9\n")

    def test_binary_refused(self):
        self.write_file("bin", b"\x00\x01\x02")
        status, data = self.get("read", path="/bin")
        self.assertEqual(status, 415)
        self.assertEqual(data["code"], "binary")

    def test_write_through_symlink_keeps_link(self):
        self.write_file("real.conf", "a")
        os.symlink("real.conf", os.path.join(self.root, "alias.conf"))
        _, data = self.get("read", path="/alias.conf")
        self.post("write", {"path": "/alias.conf", "content": "b", "expected_mtime_ns": data["mtime_ns"]})
        self.assertTrue(os.path.islink(os.path.join(self.root, "alias.conf")))
        with open(os.path.join(self.root, "real.conf")) as f:
            self.assertEqual(f.read(), "b")

    # ---- creating, renaming, deleting ----------------------------------

    def test_mkdir_touch_rename_delete(self):
        self.assertEqual(self.post("mkdir", {"path": "/d"})[0], 200)
        self.assertEqual(self.post("mkdir", {"path": "/d"})[0], 409)
        self.assertEqual(self.post("touch", {"path": "/d/f.txt"})[0], 200)
        self.assertEqual(self.post("touch", {"path": "/d/f.txt"})[0], 409)
        status, data = self.post("rename", {"path": "/d/f.txt", "name": "g.txt"})
        self.assertEqual(status, 200)
        self.assertEqual(data["path"], "/d/g.txt")
        self.assertEqual(self.post("rename", {"path": "/d/g.txt", "name": "../x"})[0], 400)
        self.post("touch", {"path": "/d/h.txt"})
        self.assertEqual(self.post("rename", {"path": "/d/g.txt", "name": "h.txt"})[0], 409)
        status, data = self.post("delete", {"paths": ["/d"]})
        self.assertEqual(status, 200)
        self.assertFalse(os.path.exists(os.path.join(self.root, "d")))

    def test_root_is_protected(self):
        self.assertEqual(self.post("delete", {"paths": ["/"]})[0], 403)
        self.assertTrue(os.path.isdir(self.root))

    def test_system_paths_protected(self):
        fs = server.FileSystem("/")
        for path in ("/etc", "/usr", "/var/www", "/home/yunohost.app"):
            with self.assertRaises(server.ApiError):
                fs.check_not_protected(path, path)
        fs.check_not_protected("/etc/nginx", "/etc/nginx")  # not protected

    # ---- copy & move ---------------------------------------------------

    def test_copy_same_folder_creates_copy(self):
        self.write_file("a.txt", "x")
        status, data = self.post("copy", {"paths": ["/a.txt"], "dest": "/"})
        self.assertEqual(status, 200)
        self.assertTrue(os.path.exists(os.path.join(self.root, "a (copy).txt")))
        self.post("copy", {"paths": ["/a.txt"], "dest": "/"})
        self.assertTrue(os.path.exists(os.path.join(self.root, "a (copy 2).txt")))

    def test_copy_conflicts(self):
        self.write_file("src/a.txt", "new")
        self.write_file("dst/a.txt", "old")
        status, data = self.post("copy", {"paths": ["/src/a.txt"], "dest": "/dst"})
        self.assertEqual(status, 409)
        self.assertEqual(data["conflicts"], ["a.txt"])
        self.post("copy", {"paths": ["/src/a.txt"], "dest": "/dst", "conflict": "rename"})
        self.assertTrue(os.path.exists(os.path.join(self.root, "dst", "a (copy).txt")))
        self.post("copy", {"paths": ["/src/a.txt"], "dest": "/dst", "conflict": "overwrite"})
        with open(os.path.join(self.root, "dst", "a.txt")) as f:
            self.assertEqual(f.read(), "new")

    def test_copy_folder_recursive(self):
        self.write_file("tree/sub/x.txt", "x")
        os.mkdir(os.path.join(self.root, "dest"))
        status, data = self.post("copy", {"paths": ["/tree"], "dest": "/dest"})
        self.assertEqual(status, 200, data)
        self.assertTrue(os.path.exists(os.path.join(self.root, "dest", "tree", "sub", "x.txt")))
        status, _ = self.post("copy", {"paths": ["/tree"], "dest": "/tree/sub"})
        self.assertEqual(status, 400)

    def test_move(self):
        self.write_file("a.txt", "x")
        os.mkdir(os.path.join(self.root, "d"))
        status, data = self.post("move", {"paths": ["/a.txt"], "dest": "/d"})
        self.assertEqual(status, 200)
        self.assertEqual(data["done"], 1)
        self.assertTrue(os.path.exists(os.path.join(self.root, "d", "a.txt")))
        self.assertEqual(self.post("move", {"paths": ["/d"], "dest": "/d"})[0], 400)
        self.write_file("a.txt", "y")
        status, data = self.post("move", {"paths": ["/a.txt"], "dest": "/d"})
        self.assertEqual(status, 409)
        status, data = self.post("move", {"paths": ["/a.txt"], "dest": "/d", "overwrite": True})
        self.assertEqual(status, 200)
        with open(os.path.join(self.root, "d", "a.txt")) as f:
            self.assertEqual(f.read(), "y")

    # ---- permissions ---------------------------------------------------

    def test_chmod(self):
        self.write_file("p/a.txt", "x")
        os.mkdir(os.path.join(self.root, "p", "sub"))
        status, data = self.post("chmod", {"paths": ["/p"], "mode": "640", "recursive": True,
                                           "apply_to": "files"})
        self.assertEqual(status, 200, data)
        self.assertEqual(os.stat(os.path.join(self.root, "p", "a.txt")).st_mode & 0o777, 0o640)
        self.assertNotEqual(os.stat(os.path.join(self.root, "p", "sub")).st_mode & 0o777, 0o640)
        self.assertEqual(self.post("chmod", {"paths": ["/p"], "mode": "999"})[0], 400)

    # ---- uploads & downloads -------------------------------------------

    def test_upload(self):
        status, data = self.upload("/up.bin", b"abc" * 1000)
        self.assertEqual(status, 200, data)
        with open(os.path.join(self.root, "up.bin"), "rb") as f:
            self.assertEqual(f.read(), b"abc" * 1000)
        status, data = self.upload("/up.bin", b"zzz")
        self.assertEqual(status, 409)
        status, data = self.upload("/up.bin", b"zzz", overwrite="1")
        self.assertEqual(status, 200)
        status, data = self.upload("/new/deep/file.txt", b"hi", mkdirs="1")
        self.assertEqual(status, 200, data)
        self.assertTrue(os.path.exists(os.path.join(self.root, "new", "deep", "file.txt")))
        status, data = self.upload("/missing/file.txt", b"hi")
        self.assertEqual(status, 400)
        self.assertEqual([n for n in os.listdir(self.root) if n.startswith(".sm-")], [])

    def test_download_file_and_zip(self):
        self.write_file("dl/a.txt", "AAA")
        self.write_file("dl/sub/b.txt", "BBB")
        res, data = self.request("GET", "/api/download", params={"path": "/dl/a.txt"}, raw=True)
        self.assertEqual(res.status, 200)
        self.assertEqual(data, b"AAA")
        self.assertIn("attachment", res.getheader("Content-Disposition"))
        res, data = self.request("GET", "/api/download", params={"path": "/dl"}, raw=True)
        self.assertEqual(res.status, 200)
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            self.assertEqual(zf.read("dl/a.txt"), b"AAA")
            self.assertEqual(zf.read("dl/sub/b.txt"), b"BBB")
        res, data = self.request("GET", "/api/download", params={"path": ["/dl/a.txt", "/dl/sub"]}, raw=True)
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            self.assertEqual(sorted(n for n in zf.namelist() if not n.endswith("/")),
                             ["a.txt", "sub/b.txt"])
        res, data = self.request("GET", "/api/download", params={"path": "/nope"}, raw=True)
        self.assertEqual(res.status, 404)
        self.assertTrue(data.startswith(b"Download failed:"))

    def test_raw_preview_only_images(self):
        self.write_file("x.png", b"\x89PNG")
        self.write_file("x.html", "<script>alert(1)</script>")
        res, _ = self.request("GET", "/api/raw", params={"path": "/x.png"}, raw=True)
        self.assertEqual(res.status, 200)
        self.assertIn("sandbox", res.getheader("Content-Security-Policy"))
        res, _ = self.request("GET", "/api/raw", params={"path": "/x.html"}, raw=True)
        self.assertEqual(res.status, 415)

    # ---- archives ------------------------------------------------------

    def test_compress_and_extract_zip(self):
        self.write_file("c/a.txt", "AAA")
        self.write_file("c/sub/b.txt", "BBB")
        status, data = self.post("compress", {"paths": ["/c"], "dest": "/", "name": "c"})
        self.assertEqual(status, 200, data)
        self.assertEqual(data["path"], "/c.zip")
        self.assertEqual(self.post("compress", {"paths": ["/c"], "dest": "/", "name": "c.zip"})[0], 409)
        status, data = self.post("extract", {"path": "/c.zip"})
        self.assertEqual(status, 200, data)
        self.assertEqual(data["path"], "/c (2)")
        with open(os.path.join(self.root, "c (2)", "c", "sub", "b.txt")) as f:
            self.assertEqual(f.read(), "BBB")

    def test_extract_tar_blocks_traversal(self):
        path = os.path.join(self.root, "evil.tar.gz")
        with tarfile.open(path, "w:gz") as tf:
            for name, content in (("ok.txt", b"ok"), ("../../escaped.txt", b"bad")):
                info = tarfile.TarInfo(name)
                info.size = len(content)
                tf.addfile(info, io.BytesIO(content))
        self.post("extract", {"path": "/evil.tar.gz"})
        self.assertFalse(os.path.exists(os.path.join(self.tmp, "escaped.txt")))
        self.assertFalse(os.path.exists(os.path.join(self.root, "escaped.txt")))

    def test_tar_fallback_filter(self):
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w") as tf:
            for name in ("ok.txt", "../bad.txt", "/abs.txt"):
                info = tarfile.TarInfo(name)
                tf.addfile(info, io.BytesIO(b""))
            link = tarfile.TarInfo("link")
            link.type = tarfile.SYMTYPE
            link.linkname = "/etc/passwd"
            tf.addfile(link)
        buf.seek(0)
        with tarfile.open(fileobj=buf) as tf:
            names = [m.name for m in server.safe_tar_members(tf, self.root)]
        self.assertEqual(names, ["ok.txt"])

    def test_extract_tar(self):
        path = os.path.join(self.root, "good.tgz")
        with tarfile.open(path, "w:gz") as tf:
            info = tarfile.TarInfo("dir/hello.txt")
            info.size = 5
            tf.addfile(info, io.BytesIO(b"hello"))
        status, data = self.post("extract", {"path": "/good.tgz"})
        self.assertEqual(status, 200, data)
        with open(os.path.join(self.root, "good", "dir", "hello.txt")) as f:
            self.assertEqual(f.read(), "hello")

    # ---- search --------------------------------------------------------

    def test_search(self):
        self.write_file("s/one/nginx.conf", "")
        self.write_file("s/two/NGINX-site.conf", "")
        self.write_file("s/two/other.txt", "")
        status, data = self.get("search", path="/s", q="nginx")
        self.assertEqual(status, 200)
        self.assertEqual(sorted(r["name"] for r in data["results"]), ["NGINX-site.conf", "nginx.conf"])
        status, data = self.get("search", path="/s", q="*.txt")
        self.assertEqual([r["name"] for r in data["results"]], ["other.txt"])
        self.assertEqual(data["results"][0]["dir"], "/s/two")


if __name__ == "__main__":
    unittest.main()
