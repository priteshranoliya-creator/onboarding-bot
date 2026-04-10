// Vercel serverless handler for D-1 webhook from Apps Script.
const { handler } = require('../src/triggers/onboard');

module.exports = async (req, res) => {
  // Ensure body is parsed (Vercel may not auto-parse in all cases)
  if (!req.body && req.method === 'POST') {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    try {
      req.body = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
      req.body = {};
    }
  }
  return handler(req, res);
};
