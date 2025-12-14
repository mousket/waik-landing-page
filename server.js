// Load environment variables from .env file
require('dotenv').config()

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

// Set NODE_ENV if not already set
const dev = process.env.NODE_ENV !== 'production'

// HOSTNAME Configuration:
// - '0.0.0.0': Bind to all network interfaces (for production with reverse proxy/cPanel)
// - 'localhost': Bind only to localhost (for local development only)
// - undefined: Next.js will auto-detect (default behavior)
// For cPanel deployment, typically use '0.0.0.0' or leave undefined
const hostname = process.env.HOSTNAME || (dev ? undefined : '0.0.0.0')

// PORT: Use PORT from environment (cPanel usually sets this), or default to 3000
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err
    const displayHostname = hostname || 'localhost'
    console.log(`> Ready on http://${displayHostname}:${port}`)
    console.log(`> Environment: ${process.env.NODE_ENV || 'development'}`)
  })
})

