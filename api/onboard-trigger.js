// Vercel serverless handler for D-1 webhook from Apps Script.
const { handler } = require('../src/triggers/onboard');

async function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

module.exports = async (req, res) => {
  if (req.method === 'POST' && (!req.body || typeof req.body !== 'object')) {
    req.body = await readBody(req);
  }
  return handler(req, res);
};
