// Simple Node.js serverless function for Vercel

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS method for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Handle non-POST methods
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Return test data
  const result = {
    text: 'Test OCR response',
    parsed_data: {
      name: 'Test Name',
      title: 'Test Title',
      company: 'Test Company',
      email: 'test@example.com',
      phone: '123-456-7890',
      website: 'test.com',
      address: 'Test Address'
    },
    success: true
  };
  
  // Return the response
  res.status(200).json(result);
}
