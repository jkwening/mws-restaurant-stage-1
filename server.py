import http.server
import socketserver

PORT = 8000

Handler = http.server.SimpleHTTPRequestHandler

Handler.extensions_map = {
  '.manifest': 'text/cache-manifest',
  '.html': 'text/html',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.svg': 'image/svg+xml',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '': 'application/octet-stream' # default
}

with socketserver.TCPServer(("", PORT), Handler) as httpd:
  print("Serving on port", PORT)
  httpd.serve_forever()
