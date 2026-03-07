export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { symbol } = req.body;
    res.json({ message: `Bot stopped for ${symbol}`, trades: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
