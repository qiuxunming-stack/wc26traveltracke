/**
 * 圣球赛事助手 Web MVP — 本地代理服务器
 * 
 * 用途：worldcup26.ir API 只允许自家域名 CORS，
 *       本地开发时需要用代理转发请求以绕过浏览器 CORS 限制。
 * 
 * 用法：node server.js
 *       浏览器打开 http://localhost:3000
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const API_TARGET = 'worldcup26.ir';
const STATIC_DIR = __dirname;

// MIME types
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Proxy API requests
  if (url.pathname.startsWith('/api/')) {
    return proxyApi(req, res, url);
  }

  // Serve static files
  return serveStatic(req, res, url);
});

function proxyApi(req, res, url) {
  // Remove /api prefix to get the actual API path
  const apiPath = url.pathname.replace(/^\/api/, '') + url.search;

  const options = {
    hostname: API_TARGET,
    port: 443,
    path: apiPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: API_TARGET,
      origin: `https://${API_TARGET}`,
      referer: `https://${API_TARGET}/`,
    },
  };

  // Remove hop-by-hop headers
  delete options.headers['connection'];
  delete options.headers['keep-alive'];
  delete options.headers['proxy-connection'];

  console.log(`[proxy] ${req.method} ${apiPath}`);

  const proxyReq = https.request(options, (proxyRes) => {
    // Forward CORS headers from the target, plus our own
    const corsHeaders = {
      'Access-Control-Allow-Origin': `http://localhost:${PORT}`,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,Accept',
    };

    // Filter out restrictive headers from the API
    const skipHeaders = new Set([
      'access-control-allow-origin',
      'access-control-allow-credentials',
      'cross-origin-opener-policy',
      'cross-origin-resource-policy',
      'x-frame-options',
      'content-security-policy',
    ]);

    const responseHeaders = { ...corsHeaders };
    for (const [key, val] of Object.entries(proxyRes.headers)) {
      if (!skipHeaders.has(key.toLowerCase())) {
        responseHeaders[key] = val;
      }
    }

    res.writeHead(proxyRes.statusCode, responseHeaders);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[proxy error] ${err.message}`);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
  });

  proxyReq.setTimeout(30000, () => {
    proxyReq.destroy();
    res.writeHead(504, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Gateway timeout' }));
  });

  req.pipe(proxyReq);
}

function serveStatic(req, res, url) {
  let filePath = url.pathname;

  // Default to index.html
  if (filePath === '/' || filePath === '') {
    filePath = '/index.html';
  }

  // Security: prevent directory traversal
  const safePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(STATIC_DIR, safePath);

  // Ensure path is within STATIC_DIR
  if (!fullPath.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(fullPath).toLowerCase();

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA fallback: serve index.html for unknown paths
        fs.readFile(path.join(STATIC_DIR, 'index.html'), (err2, html) => {
          if (err2) {
            res.writeHead(404);
            res.end('Not Found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
        });
        return;
      }
      res.writeHead(500);
      res.end('Internal Server Error');
      console.error(`[static error] ${err.message}`);
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(data);
  });
}

server.listen(PORT, () => {
  console.log(`\n  ⚽ 圣球赛事助手 Web MVP`);
  console.log(`  ─────────────────────────`);
  console.log(`  Local:  http://localhost:${PORT}`);
  console.log(`  API:    https://${API_TARGET} (proxied via /api/*)`);
  console.log(`\n  Press Ctrl+C to stop\n`);
});
