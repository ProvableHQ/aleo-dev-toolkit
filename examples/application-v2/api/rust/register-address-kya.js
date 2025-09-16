export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, kya_hash } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    if (!kya_hash) {
      return res.status(400).json({ error: 'KYA hash is required' });
    }

    console.log('Proxying register-address-kya request for address:', address, 'with KYA hash:', kya_hash);

    // Forward the request to the Rust server
    const response = await fetch('https://zpass-v2-kya-405771480101.europe-west1.run.app/register-address-kya', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        address,
        kya_hash 
      }),
    });

    const data = await response.json();

    // Forward the response back to the client
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying register-address-kya request:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to register address and KYA hash',
      details: error.message 
    });
  }
}
