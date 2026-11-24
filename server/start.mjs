import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachRooms } from './rooms.mjs';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
await access(resolve(dist, 'index.html'));
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(dist, pathname === '/' ? 'index.html' : `.${pathname}`);
    const name = relative(dist, file);
    if (name === '..' || name.startsWith(`..${sep}`) || resolve(dist, name) !== file) {
      response.writeHead(404).end();
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(file)] ?? 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': name.startsWith(`assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache'
    });
    if (request.method === 'HEAD') response.end();
    else createReadStream(file).on('error', () => response.destroy()).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
});

attachRooms(server);
const port = Number(process.env.PORT || 5173);
server.listen(port, '0.0.0.0', () => console.log(`Festival game listening on port ${server.address().port}`));
