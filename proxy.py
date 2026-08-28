#!/usr/bin/env python3
"""Tiny reverse proxy: / -> game static files, /supabase/ -> Supabase Kong API"""
import http.server, urllib.request, urllib.parse, os, json, ssl

SUPABASE_URL = "http://100.105.179.50:8000"
GAME_DIR = "/root/vibe-drive-jersey"
PORT = 5174

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=GAME_DIR, **kwargs)

    def do_GET(self):
        if self.path.startswith("/supabase/"):
            self.proxy_to_supabase("GET")
        elif self.path.startswith("/flights/"):
            self.proxy_flights(self.path[len("/flights/"):])
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith("/supabase/"):
            self.proxy_to_supabase("POST")
        else:
            self.send_error(405)

    def do_PATCH(self):
        if self.path.startswith("/supabase/"):
            self.proxy_to_supabase("PATCH")
        else:
            self.send_error(405)

    def do_PUT(self):
        if self.path.startswith("/supabase/"):
            self.proxy_to_supabase("PUT")
        else:
            self.send_error(405)

    def do_DELETE(self):
        if self.path.startswith("/supabase/"):
            self.proxy_to_supabase("DELETE")
        else:
            self.send_error(405)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "apikey, authorization, content-type, prefer, x-client-info")
        self.end_headers()

    def proxy_flights(self, path):
        # The live flight feed (Azure blob) has CORS disabled, so the browser blocks a
        # direct cross-origin fetch and the Airport Board renders blank. Proxy it through
        # the game's own origin so the page can load it without CORS.
        url = f"https://pojcdn.blob.core.windows.net/data/{path}"
        try:
            with urllib.request.urlopen(url, timeout=30) as resp:
                body = resp.read()
                self.send_response(resp.status)
                self.send_header("Content-Type", resp.headers.get("Content-Type", "application/json"))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(body)
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())


    def proxy_to_supabase(self, method):
        # Strip /supabase/ prefix and forward to Supabase
        supabase_path = self.path[len("/supabase/"):]
        url = f"{SUPABASE_URL}/{supabase_path}"

        # Read body
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        # Forward headers (except host)
        headers = {}
        for key, val in self.headers.items():
            if key.lower() not in ("host", "transfer-encoding", "connection"):
                headers[key] = val

        req = urllib.request.Request(url, data=body, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_body = resp.read()
                self.send_response(resp.status)
                for key, val in resp.getheaders():
                    if key.lower() not in ("transfer-encoding", "connection"):
                        self.send_header(key, val)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(resp_body)
        except urllib.error.HTTPError as e:
            resp_body = e.read()
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(resp_body)
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def end_headers(self):
        # Add CORS to all responses
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

if __name__ == "__main__":
    server = http.server.HTTPServer(("0.0.0.0", PORT), ProxyHandler)
    print(f"Proxy serving on :{PORT} (game + /supabase/ API)")
    server.serve_forever()