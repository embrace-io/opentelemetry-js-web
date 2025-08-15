import { createServer } from 'node:http';
// Easier to parse incoming requests with a known type, only used for tests
import type { IExportTraceServiceRequest } from '@opentelemetry/otlp-transformer/build/esnext/trace/internal-types.js';
import type { ReceivedSpans } from '../index.js';
import { extname, join, dirname } from 'node:path';
import { readFile } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = 3001;

const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
};

const receivedSpans: ReceivedSpans = {};

const server = createServer((req, res) => {
  // allow cors
  const origin = req.headers.origin || '*';

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  if (req.method === 'GET' && req.url === '/health-check') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');

    return;
  }

  if (req.url == '/received-spans') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(receivedSpans));

    return;
  }

  if (req.url?.includes('logs')) {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString(); // convert Buffer to string
    });

    req.on('end', () => {
      console.log('Received logs request', body);
    });

    res.statusCode = 200;
    res.end('OK');

    return;
  }

  if (req.url?.includes('traces')) {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString(); // convert Buffer to string
    });

    req.on('end', () => {
      try {
        const request: IExportTraceServiceRequest = JSON.parse(body);

        console.log('request', request);

        const sessionId =
          request.resourceSpans?.[0]?.scopeSpans?.[0]?.spans?.[0].attributes.find(
            attr => attr.key === 'session.id'
          )?.value.stringValue;

        if (!sessionId) {
          res.writeHead(400);
          res.end('Session ID not found');
          return;
        }

        receivedSpans[sessionId] = true;
        console.log('Stored a new session ID:', sessionId);

        res.statusCode = 200;
        res.end('OK');
      } catch (err) {
        console.error('Invalid JSON');
        res.statusCode = 400;
        res.end('Invalid JSON');
      }
    });
  }

  if (req.url?.includes('public')) {
    const url = new URL(
      `http://${process.env.HOST ?? 'localhost'}${req.url ?? '/'}`
    );
    const filePath = join(__dirname, url.pathname);

    readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File Not Found');
        return;
      }

      const ext = extname(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  }

  return;
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT.toString()}`);
});
