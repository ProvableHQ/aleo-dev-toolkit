export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    console.log('Proxying verify request for address:', address);

    // Forward the request to the Rust server
    const response = await fetch('https://zpass-v2-kya-405771480101.europe-west1.run.app/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    });

    const data = await response.json();

    // Forward the response back to the client
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying verify request:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to register address',
      details: error.message 
    });
  }
}
