#!/usr/bin/env python3
"""
Simple local web server to preview and host the Brave YouTube Downloader website.
Runs on http://localhost:8080 and opens automatically in the browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Clean logging
        sys.stderr.write(f"[{self.log_date_time_string()}] {args[0]} - {args[1]}\n")

def run():
    os.chdir(DIRECTORY)
    # Check if download package exists, if not generate it
    dist_zip = os.path.join(DIRECTORY, "downloads", "Brave-YouTube-Downloader-Setup.zip")
    if not os.path.exists(dist_zip):
        print("Setup zip not found in downloads. Running packager...")
        packager = os.path.join(DIRECTORY, "..", "package_release.py")
        if os.path.exists(packager):
            os.system(f'python "{packager}"')

    server_address = ("", PORT)
    try:
        with socketserver.TCPServer(server_address, Handler) as httpd:
            url = f"http://localhost:{PORT}/"
            print("=" * 65)
            print("   🚀 Brave YouTube Downloader Website is Live!")
            print(f"   URL: {url}")
            print("   Press Ctrl+C to stop the server.")
            print("=" * 65)
            webbrowser.open(url)
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 98 or e.winerror == 10048:
            alt_port = 8085
            with socketserver.TCPServer(("", alt_port), Handler) as httpd:
                url = f"http://localhost:{alt_port}/"
                print(f"Port {PORT} busy. Running on {url}")
                webbrowser.open(url)
                httpd.serve_forever()
        else:
            raise

if __name__ == "__main__":
    run()
