// Combines the local API (jedzto-local-api, port 8001) and the Expo Metro
// bundler (port 8081) behind a single port, so a free-tier ngrok tunnel
// (which only grants one stable hostname) can expose both at once.
// GraphQL/health/playground/maps/uploads paths go to the API; everything
// else (JS bundle, assets, Expo manifest, Metro HMR websocket) goes to Metro.
const http = require('http')
const net = require('net')

const METRO_PORT = Number(process.env.METRO_PORT || 8081)
const API_PORT = Number(process.env.API_PORT || 8001)
const PROXY_PORT = Number(process.env.PROXY_PORT || 8090)

const isApiPath = (url = '') =>
  url.startsWith('/graphql') ||
  url.startsWith('/health') ||
  url.startsWith('/playground') ||
  url.startsWith('/maps') ||
  url.startsWith('/uploads')

const targetPortFor = (url) => (isApiPath(url) ? API_PORT : METRO_PORT)

const server = http.createServer((req, res) => {
  const targetPort = targetPortFor(req.url)
  const proxyReq = http.request(
    { host: '127.0.0.1', port: targetPort, path: req.url, method: req.method, headers: req.headers },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers)
      proxyRes.pipe(res)
    }
  )
  req.pipe(proxyReq)
  proxyReq.on('error', (err) => {
    res.writeHead(502)
    res.end(`Proxy error: ${err.message}`)
  })
})

server.on('upgrade', (req, clientSocket, head) => {
  const targetPort = targetPortFor(req.url)
  const upstream = net.connect(targetPort, '127.0.0.1', () => {
    const headerLines = Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`)
    const requestLine = `${req.method} ${req.url} HTTP/1.1\r\n${headerLines.join('\r\n')}\r\n\r\n`
    upstream.write(requestLine)
    if (head && head.length) upstream.write(head)
    upstream.pipe(clientSocket)
    clientSocket.pipe(upstream)
  })
  upstream.on('error', () => clientSocket.destroy())
  clientSocket.on('error', () => upstream.destroy())
})

server.listen(PROXY_PORT, () => {
  console.log(`Dev tunnel proxy listening on http://localhost:${PROXY_PORT}`)
  console.log(`  -> /graphql, /health, /playground, /maps, /uploads  => 127.0.0.1:${API_PORT} (API)`)
  console.log(`  -> everything else                                  => 127.0.0.1:${METRO_PORT} (Metro)`)
})
