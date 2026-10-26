"""Web terminal for Server Manager.

Runs a shell in a pseudo-terminal and connects it to the browser through a
WebSocket (RFC 6455, implemented with the standard library only).

Two ways of starting the shell:

- "systemd-run" (used when the app runs as root): the shell is started by
  systemd as a transient service. It is therefore a regular root session,
  outside of the sandbox of the file manager service, so that commands such as
  apt, systemctl or yunohost work as they would over SSH.
- "direct": the shell is a child of the app, with the app's own user and
  restrictions.
"""

import base64
import fcntl
import hashlib
import json
import logging
import os
import pwd
import select
import shutil
import signal
import struct
import subprocess
import termios
import threading
import time

log = logging.getLogger("server-manager")

WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
MAX_MESSAGE = 1024 * 1024
DEFAULT_PATH = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

OP_CONT, OP_TEXT, OP_BINARY, OP_CLOSE, OP_PING, OP_PONG = 0x0, 0x1, 0x2, 0x8, 0x9, 0xA


class WebSocketClosed(Exception):
    pass


class TerminalError(Exception):
    pass


def accept_key(key):
    digest = hashlib.sha1((key + WS_GUID).encode("ascii")).digest()
    return base64.b64encode(digest).decode("ascii")


def _unmask(data, mask):
    n = len(data)
    key = (mask * (n // 4 + 1))[:n]
    return (int.from_bytes(data, "big") ^ int.from_bytes(key, "big")).to_bytes(n, "big")


class WebSocket:
    """Server side of a WebSocket connection, after the handshake."""

    def __init__(self, rfile, sock):
        self.rfile = rfile
        self.sock = sock
        self.lock = threading.Lock()
        self.closed = False

    def _read(self, n):
        data = self.rfile.read(n) if n else b""
        if data is None or len(data) < n:
            raise WebSocketClosed()
        return data

    def recv(self):
        """Return (opcode, payload) of the next text or binary message."""
        opcode = None
        message = b""
        while True:
            b1, b2 = self._read(2)
            fin = b1 & 0x80
            op = b1 & 0x0F
            length = b2 & 0x7F
            if length == 126:
                length = struct.unpack("!H", self._read(2))[0]
            elif length == 127:
                length = struct.unpack("!Q", self._read(8))[0]
            if not b2 & 0x80:  # browsers always mask their frames
                self.close(1002)
                raise WebSocketClosed()
            if length > MAX_MESSAGE or len(message) + length > MAX_MESSAGE:
                self.close(1009)
                raise WebSocketClosed()
            mask = self._read(4)
            payload = _unmask(self._read(length), mask) if length else b""
            if op == OP_CLOSE:
                self.close()
                raise WebSocketClosed()
            if op == OP_PING:
                self.send(OP_PONG, payload)
                continue
            if op == OP_PONG:
                continue
            if op in (OP_TEXT, OP_BINARY):
                opcode, message = op, payload
            elif op == OP_CONT and opcode is not None:
                message += payload
            else:
                self.close(1002)
                raise WebSocketClosed()
            if fin:
                return opcode, message

    def send(self, opcode, payload):
        n = len(payload)
        if n < 126:
            header = struct.pack("!BB", 0x80 | opcode, n)
        elif n < 65536:
            header = struct.pack("!BBH", 0x80 | opcode, 126, n)
        else:
            header = struct.pack("!BBQ", 0x80 | opcode, 127, n)
        with self.lock:
            if self.closed:
                raise WebSocketClosed()
            self.sock.sendall(header + payload)

    def close(self, code=1000):
        with self.lock:
            if self.closed:
                return
            self.closed = True
            try:
                self.sock.sendall(struct.pack("!BBH", 0x80 | OP_CLOSE, 2, code))
            except OSError:
                pass


def set_winsize(fd, rows, cols):
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))


def clamp(value, low, high, default):
    try:
        return max(low, min(high, int(value)))
    except (TypeError, ValueError):
        return default


class Session:
    def __init__(self, sid, user, proc, master):
        self.id = sid
        self.user = user
        self.proc = proc
        self.master = master
        self.started = time.monotonic()
        self.stop = threading.Event()

    def write(self, data):
        while data:
            written = os.write(self.master, data)
            data = data[written:]

    def resize(self, rows, cols):
        set_winsize(self.master, rows, cols)

    def close(self):
        self.stop.set()
        try:
            os.close(self.master)  # hangs up the terminal: the shell gets SIGHUP
        except OSError:
            pass
        try:
            self.proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(self.proc.pid, signal.SIGKILL)
            except OSError:
                self.proc.kill()
            self.proc.wait()


class TerminalManager:
    def __init__(self, enabled=True, mode="auto", max_sessions=10):
        self.enabled = enabled
        if mode == "auto":
            mode = "systemd-run" if (os.geteuid() == 0 and shutil.which("systemd-run")
                                     and os.path.isdir("/run/systemd/system")) else "direct"
        self.mode = mode
        self.max_sessions = max_sessions
        self.sessions = {}
        self.lock = threading.Lock()
        self.counter = 0

    def _shell(self, pw):
        shell = pw.pw_shell
        if not shell or os.path.basename(shell) in ("nologin", "false") or not os.access(shell, os.X_OK):
            shell = shutil.which("bash") or "/bin/sh"
        return shell

    def command(self, cwd):
        """Return (argv, env, cwd) used to start a shell."""
        pw = pwd.getpwuid(os.geteuid())
        shell = self._shell(pw)
        lang = os.environ.get("LANG") or "C.UTF-8"
        if self.mode == "systemd-run":
            argv = [
                "systemd-run", "--pty", "--quiet", "--collect",
                "--uid=" + pw.pw_name,
                "--description=Server Manager web terminal",
                "--working-directory=" + cwd,
                "--setenv=TERM=xterm-256color", "--setenv=COLORTERM=truecolor",
                "--setenv=LANG=" + lang,
                shell, "-l",
            ]
            env = {"PATH": DEFAULT_PATH, "TERM": "xterm-256color", "LANG": lang}
            return argv, env, "/"
        home = pw.pw_dir if os.path.isdir(pw.pw_dir) else cwd
        env = {
            "TERM": "xterm-256color", "COLORTERM": "truecolor", "LANG": lang,
            "HOME": home, "USER": pw.pw_name, "LOGNAME": pw.pw_name,
            "SHELL": shell, "PATH": DEFAULT_PATH,
        }
        return [shell, "-l"], env, cwd

    def open(self, user, cwd, rows=24, cols=80):
        with self.lock:
            if len(self.sessions) >= self.max_sessions:
                raise TerminalError("Too many terminal sessions are open")
            self.counter += 1
            sid = self.counter
        argv, env, workdir = self.command(cwd)
        master, slave = os.openpty()
        try:
            set_winsize(master, rows, cols)
            # "setsid -c" makes the terminal the controlling terminal of the
            # shell, so that job control and Ctrl+C work as expected.
            setsid = shutil.which("setsid")
            prefix = [setsid, "-c", "-w"] if setsid else []
            proc = subprocess.Popen(prefix + argv, stdin=slave, stdout=slave, stderr=slave,
                                    cwd=workdir, env=env, close_fds=True,
                                    start_new_session=not setsid)
        except OSError as exc:
            os.close(master)
            raise TerminalError(f"Could not start the shell: {exc}")
        finally:
            os.close(slave)
        session = Session(sid, user, proc, master)
        with self.lock:
            self.sessions[sid] = session
        return session

    def run(self, ws, session):
        """Shuttle data between the WebSocket and the terminal until either ends."""

        def pump_output():
            try:
                while not session.stop.is_set():
                    ready, _, _ = select.select([session.master], [], [], 0.5)
                    if not ready:
                        continue
                    try:
                        data = os.read(session.master, 65536)
                    except OSError:  # EIO: the shell exited
                        break
                    if not data:
                        break
                    ws.send(OP_BINARY, data)
            except (WebSocketClosed, OSError, ValueError):
                pass
            finally:
                ws.close()
                try:
                    ws.sock.shutdown(2)  # unblock the reading loop below
                except OSError:
                    pass

        reader = threading.Thread(target=pump_output, name=f"terminal-{session.id}", daemon=True)
        reader.start()
        try:
            while True:
                opcode, payload = ws.recv()
                try:
                    msg = json.loads(payload.decode("utf-8"))
                except (UnicodeDecodeError, ValueError):
                    continue
                kind = msg.get("type") if isinstance(msg, dict) else None
                if kind == "input" and isinstance(msg.get("data"), str):
                    session.write(msg["data"].encode("utf-8", "replace"))
                elif kind == "resize":
                    session.resize(clamp(msg.get("rows"), 2, 500, 24), clamp(msg.get("cols"), 2, 1000, 80))
        except (WebSocketClosed, OSError):
            pass
        finally:
            session.stop.set()
            reader.join(timeout=2)
            session.close()
            with self.lock:
                self.sessions.pop(session.id, None)
