"""The plugin's manifest: which files it serves, and that its server answers.

Run from anywhere: python3 plugins/typescript-native-lsp/tests/test-manifest.py
"""

import json
import subprocess
import threading
import unittest
from pathlib import Path

PLUGIN = Path(__file__).resolve().parent.parent
MANIFEST = PLUGIN / ".claude-plugin" / "plugin.json"
MARKETPLACE = PLUGIN.parent.parent / ".claude-plugin" / "marketplace.json"
LANGUAGES = {
    ".ts": "typescript",
    ".tsx": "typescriptreact",
    ".mts": "typescript",
    ".cts": "typescript",
    ".js": "javascript",
    ".jsx": "javascriptreact",
    ".mjs": "javascript",
    ".cjs": "javascript",
}
REPLY_TIMEOUT = 30


def server():
    servers = json.loads(MANIFEST.read_text())["lspServers"]
    return servers["typescript"]


def read_message(stream):
    """One LSP message off the stream, or None at end of output."""
    length = None
    while True:
        line = stream.readline()
        if not line:
            return None
        if line in (b"\r\n", b"\n"):
            break
        name, _, value = line.decode("ascii").partition(":")
        if name.strip().lower() == "content-length":
            length = int(value)
    if length is None:
        return None
    return json.loads(stream.read(length))


def initialize(command):
    """Send initialize to command and return its response, failing with the reason it gave none."""
    request = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"processId": None, "rootUri": None, "capabilities": {}}}).encode()
    found: dict = {}
    with subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL) as proc:
        stdin, stdout = proc.stdin, proc.stdout
        assert stdin is not None and stdout is not None

        def read():
            while True:
                try:
                    message = read_message(stdout)
                except Exception as error:
                    found["reason"] = f"unreadable output: {error!r}"
                    return
                if message is None:
                    found["reason"] = "output ended before a reply"
                    return
                # WHY: the server sends notifications before its reply, and an echo of the request carries id 1 too; only a response has no method.
                if message.get("id") == 1 and "method" not in message:
                    found["reply"] = message
                    return

        reader = threading.Thread(target=read, daemon=True)
        reader.start()
        try:
            stdin.write(b"Content-Length: %d\r\n\r\n" % len(request) + request)
            stdin.flush()
        except BrokenPipeError:
            pass
        reader.join(REPLY_TIMEOUT)
        timed_out = reader.is_alive()
        proc.kill()
    if timed_out:
        raise AssertionError(f"no reply within {REPLY_TIMEOUT} seconds")
    if "reply" not in found:
        raise AssertionError(found["reason"])
    return found["reply"]


class Manifest(unittest.TestCase):
    def test_serves_every_typescript_and_javascript_extension(self):  # GHI-438 AC1
        self.assertEqual(server()["extensionToLanguage"], LANGUAGES)

    def test_marketplace_lists_the_plugin(self):  # GHI-438 AC1
        entries = json.loads(MARKETPLACE.read_text())["plugins"]
        sources = {entry["name"]: entry["source"] for entry in entries}
        self.assertEqual(sources.get("typescript-native-lsp"), "./plugins/typescript-native-lsp")

    def test_declared_command_answers_initialize(self):  # GHI-438 AC2
        config = server()
        reply = initialize([config["command"], *config.get("args", [])])
        self.assertIsInstance(reply.get("result", {}).get("capabilities"), dict, reply)


if __name__ == "__main__":
    unittest.main()
