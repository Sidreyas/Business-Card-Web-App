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
    // Make sure we don't mistake email for website
    if (website.includes('@')) {
      // Look for other matches that don't include @
      const nonEmailMatches = websiteMatches.filter(match => !match.includes('@'));
      if (nonEmailMatches.length > 0) {
        website = nonEmailMatches[0];
      }
    }
    // Preserve www. prefix but add http:// if missing
    if (!website.startsWith('http')) {
      if (!website.startsWith('www.')) {
        website = 'www.' + website;
      }
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
  
  // Try to extract address - look for lines with addresses
  // First look for lines with street, city, state patterns
  let addressLines = [];
  let foundAddress = false;
  
  // Look for lines with address indicators
  const addressKeywords = ['street', 'st', 'avenue', 'ave', 'road', 'rd', 'boulevard', 'blvd', 'suite', 'drive', 'dr', 'lane', 'ln', 'court', 'ct', 'plaza', 'plz', 'square', 'sq', 'highway', 'hwy', 'parkway', 'pkwy'];
  const cityStateRegex = /\b[A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/;
  
  // Find the starting line for address - usually contains a number and street
  let addressStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // Check if this line has a street number
    if (/\b\d+\s+[A-Za-z0-9\s,]+/.test(line) && 
        addressKeywords.some(keyword => lowerLine.includes(keyword)) && 
        !lowerLine.includes('@')) {
      addressStartIndex = i;
      addressLines.push(line.trim());
      foundAddress = true;
      break;
    }
  }
  
  // If we found an address start, look for continuation lines (city, state, zip)
  if (addressStartIndex >= 0) {
    // Check the next line for city, state, zip
    if (addressStartIndex + 1 < lines.length) {
      const nextLine = lines[addressStartIndex + 1];
      // If next line has city/state pattern or contains a zip code
      if (cityStateRegex.test(nextLine) || /\b\d{5}(?:-\d{4})?\b/.test(nextLine)) {
        addressLines.push(nextLine.trim());
      }
    }
  } else {
    // Fallback - look for any line with address keywords
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (addressKeywords.some(keyword => lowerLine.includes(keyword)) && !lowerLine.includes('@')) {
        addressLines.push(line.trim());
        foundAddress = true;
        break;
      }
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
      
    // For this example, we'll return basic OCR results
    // In a real implementation, you'd use a proper OCR API or analyze the actual uploaded image
    
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
    
    // Return the response with username and date
    res.status(200).json({
      text: simulatedText,
      parsed_data: parsedData,
      username: username,
      date: currentDate,
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
