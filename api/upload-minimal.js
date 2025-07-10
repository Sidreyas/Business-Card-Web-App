// Super simple serverless function for Vercel - without any dependencies
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
  
  // This is a minimal version that returns a simulated response
  // No file processing is done - just returns test data for any POST request
  
  // Return a simulated OCR response
  const simulatedText = 
    "John Doe\n" +
    "Software Engineer\n" +
    "Tech Solutions Inc.\n" +
    "john.doe@example.com\n" +
    "555-123-4567\n" +
    "www.techsolutions.com\n" +
    "123 Main Street, Suite 200\n" +
    "San Francisco, CA 94105";
  
  // Simulate parsed data
  const parsedData = {
    name: 'John Doe',
    title: 'Software Engineer',
    company: 'Tech Solutions Inc.',
    email: 'john.doe@example.com',
    phone: '555-123-4567',
    website: 'www.techsolutions.com',
    address: '123 Main Street, Suite 200, San Francisco, CA 94105'
  };
  
  // Get current date
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Return the response with simulated data
  res.status(200).json({
    text: simulatedText,
    parsed_data: parsedData,
    username: 'Guest',
    date: currentDate,
    imageInfo: {
      fileName: "Sample Image",
      fileSize: 1024,
      ocrProvider: "Simulated Provider",
      usingFallback: true
    },
    success: true
  });
}
