// Simplified serverless function for Vercel
import pkg from 'formidable';
const { IncomingForm } = pkg;
import fs from 'fs';

// Need to disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to extract information from OCR text
function extractBusinessCardInfo(text) {
  // Default structure for parsed data
  const parsedData = {
    name: '',
    title: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    address: ''
  };

  if (!text) return parsedData;
  
  // Extract email
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const emailMatches = text.match(emailRegex);
  if (emailMatches && emailMatches.length > 0) {
    parsedData.email = emailMatches[0];
  }
  
  // Extract phone numbers
  const phoneRegex = /\b(?:\+\d{1,2}\s?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  const phoneMatches = text.match(phoneRegex);
  if (phoneMatches && phoneMatches.length > 0) {
    parsedData.phone = phoneMatches[0];
  }
  
  // Extract website
  const websiteRegex = /\b(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*[a-zA-Z0-9]\.)+[a-zA-Z]{2,}(?:\/\S*)?/g;
  const websiteMatches = text.match(websiteRegex);
  
  if (websiteMatches && websiteMatches.length > 0) {
    // Filter out any email-like matches
    const nonEmailMatches = websiteMatches.filter(match => !match.includes('@'));
    
    if (nonEmailMatches.length > 0) {
      // Use the first non-email website match
      let website = nonEmailMatches[0];
      
      // Special case for common TLDs to avoid picking up parts of email addresses
      const validTLDs = ['com', 'net', 'org', 'io', 'co', 'gov', 'edu'];
      const bestMatches = nonEmailMatches.filter(match => {
        const domain = match.split('.').pop().toLowerCase();
        return validTLDs.includes(domain);
      });
      
      if (bestMatches.length > 0) {
        website = bestMatches[0];
      }
      
      // Ensure proper formatting
      if (!website.startsWith('http') && !website.startsWith('www.')) {
        website = 'www.' + website;
      }
      
      parsedData.website = website;
    }
  }
  
  // Split the text into lines
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  // First non-empty line is often the name
  if (lines.length > 0 && !parsedData.name) {
    parsedData.name = lines[0].trim();
  }
  
  // Second line is often the title
  if (lines.length > 1 && !parsedData.title) {
    parsedData.title = lines[1].trim();
  }
  
  // Third line is often the company
  if (lines.length > 2 && !parsedData.company) {
    parsedData.company = lines[2].trim();
  }
  
  // Try to extract address - look for lines with addresses
  let addressLines = [];
  let foundAddress = false;
  
  // Look for lines with address indicators
  const addressKeywords = ['street', 'st', 'avenue', 'ave', 'road', 'rd', 'suite'];
  
  // Find the starting line for address - usually contains a number and street
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // Check if this line has a street number
    if (/\b\d+\s+[A-Za-z0-9\s,]+/.test(line) && 
        addressKeywords.some(keyword => lowerLine.includes(keyword)) && 
        !lowerLine.includes('@')) {
      addressLines.push(line.trim());
      foundAddress = true;
      
      // Also include the next line if it looks like a city/state/zip
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (/[A-Z][a-z]+,\s*[A-Z]{2}\s+\d{5}/.test(nextLine)) {
          addressLines.push(nextLine.trim());
        }
      }
      break;
    }
  }
  
  // Join all address lines
  if (foundAddress) {
    parsedData.address = addressLines.join(', ');
  }
  
  return parsedData;
}

export default async function handler(req, res) {
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
  
  // Try to parse the multipart form data
  try {
    const form = new IncomingForm();
    
    // Promisify the form.parse method
    const formParse = (req) => {
      return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          else resolve({ fields, files });
        });
      });
    };
    
    const { fields, files } = await formParse(req);
    
    // Check if image file exists
    if (!files || !files.image) {
      return res.status(400).json({ 
        error: 'No image file provided',
        success: false,
        text: '',
        parsed_data: {
          name: '',
          title: '',
          company: '',
          email: '',
          phone: '',
          website: '',
          address: ''
        }
      });
    }
      
    // Get username from fields if provided
    const username = fields && fields.username ? fields.username : 'Guest';
    
    // Get current date
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    console.log(`Processing request from user: ${username}, date: ${currentDate}`);
    console.log(`File received: ${files.image.originalFilename || 'unnamed file'}`);
    
    // For now, return simulated OCR response
    // In production, this would use an OCR API
    const simulatedText = 
      "John Doe\n" +
      "Software Engineer\n" +
      "Tech Solutions Inc.\n" +
      "john.doe@example.com\n" +
      "555-123-4567\n" +
      "www.techsolutions.com\n" +
      "123 Main Street, Suite 200\n" +
      "San Francisco, CA 94105";
    
    // Extract structured information from OCR text
    const parsedData = extractBusinessCardInfo(simulatedText);
    
    // Return the response with username and date
    res.status(200).json({
      text: simulatedText,
      parsed_data: parsedData,
      username: username,
      date: currentDate,
      imageInfo: {
        fileName: files.image.originalFilename || "Unknown",
        fileSize: files.image.size || 0,
      },
      success: true
    });
      
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Unexpected server error: ' + (error.message || String(error)),
      success: false,
      text: '',
      parsed_data: {
        name: '',
        title: '',
        company: '',
        email: '',
        phone: '',
        website: '',
        address: ''
      }
    });
  }
}
