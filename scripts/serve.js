#!/usr/bin/env node
/* Local preview without Ruby/Jekyll.
   Renders index.md through pandoc into _layouts/default.html and serves the
   site folder. GitHub Pages does the real build with Jekyll (kramdown), which
   produces near-identical HTML for this content.

   Usage:  node scripts/serve.js [port]      (default 4173, needs pandoc on PATH)
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const port = parseInt(process.argv[2], 10) || 4173;

const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.pdf': 'application/pdf',
};

function readConfig() {
  const cfg = {};
  for (const line of fs.readFileSync(path.join(root, '_config.yml'), 'utf8').split('\n')) {
    const m = line.match(/^([a-z_]+):\s*(.*?)\s*$/i);
    if (m && m[2] !== '') cfg[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
  return cfg;
}

function render() {
  const site = readConfig();
  let md = fs.readFileSync(path.join(root, 'index.md'), 'utf8');
  const page = {};
  md = md.replace(/^---\n([\s\S]*?)\n---\n/, (_, fm) => {
    for (const line of fm.split('\n')) {
      const m = line.match(/^([a-z_]+):\s*(.*?)\s*$/i);
      if (m) page[m[1]] = m[2];
    }
    return '';
  });
  const body = execFileSync('pandoc', ['-f', 'markdown+autolink_bare_uris-smart', '-t', 'html5', '--wrap=none'], { input: md, encoding: 'utf8' });
  let html = fs.readFileSync(path.join(root, '_layouts', page.layout ? page.layout + '.html' : 'default.html'), 'utf8');
  const vars = {
    'page.title': page.title || site.title, 'page.description': page.description || site.description,
    'site.title': site.title, 'site.description': site.description, 'site.url': site.url,
    'site.lang': site.lang || 'en', 'site.updated': site.updated || '',
  };
  html = html.replace(/\{\{\s*content\s*\}\}/, () => body);
  html = html.replace(/\{\{\s*([a-z._]+)(?:\s*\|\s*default:\s*([a-z._]+))?(?:\s*\|\s*remove:\s*"([^"]*)")?\s*\}\}/g,
    (_, key, dflt, remove) => {
      let v = vars[key] != null && vars[key] !== '' ? vars[key] : (dflt ? vars[dflt] : '');
      if (remove) v = String(v).split(remove).join('');
      return v == null ? '' : v;
    });
  return html;
}

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '/index.html') {
    try {
      const html = render();
      res.writeHead(200, { 'Content-Type': mime['.html'], 'Cache-Control': 'no-store' });
      return res.end(html);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Render failed:\n' + (e.stderr || e.message));
    }
  }
  const file = path.join(root, urlPath);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => {
  console.log('CV preview at http://localhost:' + port + '/');
});
