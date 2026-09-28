// HTTP + WebSocket server. In development it also serves the web app through Vite.

import http from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { WebSocketServer } from 'ws';
import { openBookingService } from './booking.ts';
import { runAgentSession } from './agent-session.ts';

const PORT = Number(process.env.PORT ?? 3000);
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');
const apiKey = process.env.DEEPGRAM_API_KEY;
if (!apiKey) {
  console.error('DEEPGRAM_API_KEY is missing. Put it in .env (see .env.example).');
  process.exit(1);
}

mkdirSync('data', { recursive: true });
const service = openBookingService({ path: process.env.DB_PATH ?? 'data/bookings.db' });

const agentSockets = new WebSocketServer({ noServer: true });

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function handleApi(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  if (req.url === '/api/state' && req.method === 'GET') {
    sendJson(res, 200, service.snapshot());
    return true;
  }
  if (req.url === '/api/reset' && req.method === 'POST') {
    service.reset();
    sendJson(res, 200, service.snapshot());
    return true;
  }
  return false;
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json',
};

function serveStatic(req: http.IncomingMessage, res: http.ServerResponse) {
  const root = join('web', 'dist');
  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = normalize(join(root, urlPath));
  if (!file.startsWith(normalize(root)) || !existsSync(file) || urlPath.endsWith('/')) file = join(root, 'index.html');
  res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}

const server = http.createServer();

let viteMiddleware: ((req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => void) | null = null;
if (!isProduction) {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true, hmr: { server } }, appType: 'spa' });
  viteMiddleware = vite.middlewares;
}

server.on('request', (req, res) => {
  if (handleApi(req, res)) return;
  if (viteMiddleware) viteMiddleware(req, res, () => sendJson(res, 404, { error: 'not found' }));
  else serveStatic(req, res);
});

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/agent') {
    agentSockets.handleUpgrade(req, socket, head, (ws) => runAgentSession(ws, service, apiKey));
  }
  // Other upgrades (Vite hot reload) are handled by Vite's own listener.
});

server.listen(PORT, () => console.log(`Rental Desk running at http://localhost:${PORT}`));
