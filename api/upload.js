// Node.js serverless function for Vercel with multipart file handling
import { IncomingForm } from 'formidable';
import fs from 'fs';
import https from 'https';
import { promisify } from 'util';

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
  const websiteRegex = /\b(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)(?:\/[^\s]*)?/g;
  const websiteMatches = text.match(websiteRegex);
  if (websiteMatches && websiteMatches.length > 0) {
    // Clean up the website URL
    let website = websiteMatches[0];
    if (!website.startsWith('http')) {
      website = website.replace(/^www\./, '');
    }
    parsedData.website = website;
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
  
  // Try to extract address - look for patterns with numbers and street names
  // This is a very basic approach; real address extraction would be more complex
  const addressRegex = /\b\d+\s+[A-Za-z0-9\s,]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|plaza|plz|square|sq|highway|hwy|parkway|pkwy)\b/i;
  const addressMatch = text.match(addressRegex);
  if (addressMatch) {
    parsedData.address = addressMatch[0];
  } else {
    // Look for lines that might contain address information
    // This is a fallback if the regex doesn't find anything
    const addressKeywords = ['street', 'st', 'avenue', 'ave', 'road', 'rd', 'boulevard', 'blvd', 'suite', 'floor', 'fl'];
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (addressKeywords.some(keyword => lowerLine.includes(keyword)) && !lowerLine.includes('@')) {
        parsedData.address = line.trim();
        break;
      }
    }
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
      
    // For this example, we'll return basic OCR results
    // In a real implementation, you'd use a proper OCR API
    // Since we can't use Python easily on Vercel, we're providing a simulated response
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
    
    // Return the response
    res.status(200).json({
      text: simulatedText,
      parsed_data: parsedData,
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
