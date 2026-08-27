import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = fileURLToPath(new URL('.', import.meta.url));
const publicDirectory = resolve(projectDirectory, 'public');
const requestedPort = Number.parseInt(process.env.PORT || '4173', 10);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function findFile(requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  const relative = normalize(decoded).replace(/^([/\\])+/, '');
  let candidate = resolve(join(publicDirectory, relative));

  if (!candidate.startsWith(publicDirectory)) return null;
  if (existsSync(candidate) && statSync(candidate).isDirectory()) candidate = join(candidate, 'index.html');
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;

  if (!extname(candidate)) {
    const htmlCandidate = `${candidate}.html`;
    if (existsSync(htmlCandidate) && statSync(htmlCandidate).isFile()) return htmlCandidate;
  }
  return join(publicDirectory, 'index.html');
}

const server = createServer((request, response) => {
  const file = findFile(request.url || '/');
  if (!file || !existsSync(file)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': mimeTypes[extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': extname(file) === '.html' ? 'no-cache' : 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    'Permissions-Policy': 'camera=(self), microphone=()',
  });
  createReadStream(file).pipe(response);
});

server.listen(requestedPort, '127.0.0.1', () => {
  console.log(`Sentinel preview: http://127.0.0.1:${requestedPort}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
