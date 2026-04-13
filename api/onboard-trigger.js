// Vercel serverless handler for D-1 webhook from Apps Script.
const { handler } = require('../src/triggers/onboard');

async function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      try {
        resolve({ parsed: JSON.parse(raw), raw });
      } catch {
        resolve({ parsed: {}, raw });
      }
    });
    req.on('error', () => resolve({ parsed: {}, raw: '' }));
  });
}

module.exports = async (req, res) => {
  const diag = {
    method: req.method,
    hasBody: !!req.body,
    bodyType: typeof req.body,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    version: 'v2-manual-parse',
  };

  if (req.method === 'POST' && (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0)) {
    const result = await readBody(req);
    req.body = result.parsed;
    diag.rawLength = result.raw.length;
    diag.rawStart = result.raw.substring(0, 50);
    diag.parsedKeys = Object.keys(result.parsed);
  }

  // Pass diagnostics through for debugging
  req._diag = diag;
  return handler(req, res);
};
