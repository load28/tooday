#!/usr/bin/env python3
"""CSR 정적 서버 — 클라이언트 라우트(/today, /login …)는 index.html로 폴백한다.

BFF와 **같은 호스트**로 띄워야 한다. 인증 쿠키가 SameSite=Lax라, 호스트가 다르면
(예: 웹은 127.0.0.1, BFF는 localhost) 교차 사이트가 되어 쿠키가 실리지 않는다.
"""
import http.server
import os
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "dist"
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8080


class SpaHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path != "/" and not os.path.isfile(os.path.join(ROOT, path.lstrip("/"))):
            self.path = "/index.html"
        return super().do_GET()

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print(f"http://localhost:{PORT} ({ROOT})")
    http.server.ThreadingHTTPServer(("0.0.0.0", PORT), SpaHandler).serve_forever()
