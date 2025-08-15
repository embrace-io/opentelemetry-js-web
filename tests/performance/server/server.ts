import { createServer } from 'http';
import { readFile, copyFile } from 'fs';
import { extname, join } from 'path';

const PORT = 3000;

const PUBLIC_DIR = join(process.cwd(), 'public');
const SDK_SOURCE = join(process.cwd(), './platforms/vite-7/dist/bundle.js');
const SDK_DESTINATION = join(PUBLIC_DIR, 'bundle.js');

const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
};

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
    return;
  }

  if (req.method === 'GET' && req.url === '/health-check') {
    res.statusCode = 200;
    res.end('OK');
    return;
  }

  if (req.method === 'GET' && req.url === '/sample-request') {
    res.statusCode = 200;
    res.end('OK');
    return;
  }

  if (req.method === 'POST') {
    res.statusCode = 200;
    res.end('OK');
    return;
  }

  if (!req.url) {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }

  const url = new URL(
    `http://${process.env.HOST ?? 'localhost'}${req.url ?? '/'}`
  );

  const filePath = join(PUBLIC_DIR, url.pathname);

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
});

// Copy the SDK file to the public directory
copyFile(SDK_SOURCE, SDK_DESTINATION, err => {
  if (err) {
    console.error('Failed to copy SDK file:', err);
  } else {
    console.log('SDK file copied to public directory.');
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT.toString()}`);
});
