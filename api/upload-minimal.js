// Real OCR serverless function for Vercel
import { createReadStream } from 'fs';
import { readFile } from 'fs/promises';

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart form data manually
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      req.on('end', resolve);
      req.on('error', reject);
    });

    const buffer = Buffer.concat(chunks);
    
    // Extract boundary from content-type header
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return res.status(400).json({ error: 'No boundary found' });
    }

    // Parse the multipart data
    const parts = buffer.toString('binary').split('--' + boundary);
    let imageBuffer = null;
    let username = 'Guest';

    for (const part of parts) {
      if (part.includes('Content-Disposition: form-data; name="image"')) {
        // Extract image data
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          const imageData = part.substring(headerEnd + 4);
          // Remove trailing boundary markers
          const cleanImageData = imageData.replace(/\r\n--.*$/, '');
          imageBuffer = Buffer.from(cleanImageData, 'binary');
        }
      } else if (part.includes('Content-Disposition: form-data; name="username"')) {
        // Extract username
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          const usernameData = part.substring(headerEnd + 4);
          username = usernameData.replace(/\r\n--.*$/, '').trim();
        }
      }
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      return res.status(400).json({ error: 'No image data received' });
    }

    console.log(`Processing image for user: ${username}, size: ${imageBuffer.length} bytes`);

    // Call OCR.space API
    const ocrResult = await performOCR(imageBuffer);
    
    // Parse the extracted text
    const parsedData = extractBusinessCardInfo(ocrResult.text);
    
    // Get current date
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Return the response
    res.status(200).json({
      text: ocrResult.text,
      parsed_data: parsedData,
      username: username,
      date: currentDate,
      imageInfo: {
        fileName: "uploaded-image",
        fileSize: imageBuffer.length,
        ocrProvider: "OCR.space",
        usingFallback: ocrResult.usingFallback || false
      },
      success: true
    });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ 
      error: 'Server error: ' + error.message,
      success: false 
    });
  }
}

// Function to perform OCR using OCR.space API
async function performOCR(imageBuffer) {
  try {
    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    
    // Prepare form data as URL-encoded string
    const formData = new URLSearchParams();
    formData.append('apikey', 'K83418579388957'); // Free OCR.space API key
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('OCREngine', '2'); // Use engine 2 for better accuracy
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
    
    console.log('Calling OCR.space API with enhanced settings...');
    
    // Make the API call using fetch
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });
    
    if (!response.ok) {
      throw new Error(`OCR API returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('OCR API response received:', JSON.stringify(result, null, 2));
    
    if (result.ParsedResults && result.ParsedResults.length > 0) {
      const extractedText = result.ParsedResults[0].ParsedText;
      console.log('OCR text extracted successfully:', extractedText);
      
      // Clean up the extracted text
      const cleanedText = extractedText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
      
      return {
        text: cleanedText,
        success: true,
        rawResponse: result
      };
    } else {
      console.log('OCR failed - no parsed results:', result);
      return {
        text: "Unable to extract text from image. Please try with a clearer image.",
        success: false,
        usingFallback: true,
        error: result.ErrorMessage || 'No text found'
      };
    }
    
  } catch (error) {
    console.error('OCR API error:', error);
    return {
      text: "Error processing image: " + error.message,
      success: false,
      usingFallback: true,
      error: error.message
    };
  }
}

// Helper function to extract information from OCR text
// Enhanced business card parsing function
function extractBusinessCardInfo(text) {
  console.log('Extracting business card info from:', text);
  
  const parsedData = {
    name: '',
    title: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    rawText: text
  };

  if (!text || text.includes("Unable to extract") || text.includes("Error processing")) {
    return parsedData;
  }
  
  // Split the text into lines and clean them
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !line.match(/^[\s\-_=]+$/)); // Remove lines with only separators
  
  console.log('Cleaned lines:', lines);
  
  // Extract email (most reliable)
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  for (const line of lines) {
    const emailMatch = line.match(emailRegex);
    if (emailMatch && !parsedData.email) {
      parsedData.email = emailMatch[0];
      break;
    }
  }
  
  // Enhanced phone number extraction (more flexible)
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})|(\+\d{1,3}[-.\s]?)?\d{8,15}|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  for (const line of lines) {
    const phoneMatch = line.match(phoneRegex);
    if (phoneMatch && !parsedData.phone) {
      // Clean up the phone number
      let phone = phoneMatch[0].replace(/[^\d+()-.\s]/g, '');
      parsedData.phone = phone.trim();
      break;
    }
  }
  
  // Enhanced website extraction
  const websiteRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?(?:\/\S*)?/g;
  for (const line of lines) {
    const websiteMatch = line.match(websiteRegex);
    if (websiteMatch && !parsedData.website && !line.includes('@')) {
      let website = websiteMatch[0];
      
      // Validate it's not an email
      if (!website.includes('@')) {
        // Add www. if needed
        if (!website.startsWith('http') && !website.startsWith('www.')) {
          website = 'www.' + website;
        }
        parsedData.website = website;
        break;
      }
    }
  }
  
  // Enhanced title keywords (more comprehensive)
  const titleKeywords = [
    'CEO', 'CTO', 'CFO', 'COO', 'President', 'Director', 'Manager', 'Senior', 'Lead', 
    'Engineer', 'Developer', 'Designer', 'Analyst', 'Consultant', 'Specialist', 
    'Executive', 'Vice President', 'VP', 'Assistant', 'Coordinator', 'Supervisor',
    'Partner', 'Founder', 'Owner', 'Principal', 'Chief', 'Head', 'Administrator',
    'Sales', 'Marketing', 'Operations', 'Finance', 'HR', 'Human Resources',
    'Account', 'Project', 'Product', 'Business', 'Strategy', 'Technical'
  ];
  
  // Enhanced company indicators
  const companyIndicators = [
    'Inc', 'Corp', 'Corporation', 'LLC', 'Ltd', 'Limited', 'Company', 'Co.',
    'Solutions', 'Services', 'Systems', 'Technologies', 'Tech', 'Group', 'Associates',
    'Partners', 'Consulting', 'Holdings', 'Enterprises', 'International', 'Global',
    'Industries', 'Ventures', 'Capital', 'Fund', 'Bank', 'Insurance', 'Healthcare'
  ];
  
  // Process lines to find name, title, company
  let usedLines = new Set();
  
  // First pass: Find obvious titles and companies
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip contact info lines
    if (line.includes('@') || parsedData.phone && line.includes(parsedData.phone.replace(/\D/g, '').slice(-4)) || 
        (parsedData.website && line.toLowerCase().includes(parsedData.website.toLowerCase()))) {
      continue;
    }
    
    // Check for title keywords
    const hasTitle = titleKeywords.some(keyword => 
      line.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (hasTitle && !parsedData.title && line.length > 2) {
      parsedData.title = line;
      usedLines.add(i);
      continue;
    }
    
    // Check for company indicators
    const hasCompanyIndicator = companyIndicators.some(indicator => 
      line.toLowerCase().includes(indicator.toLowerCase())
    );
    
    if (hasCompanyIndicator && !parsedData.company && line.length > 2) {
      parsedData.company = line;
      usedLines.add(i);
      continue;
    }
  }
  
  // Second pass: Find name (first meaningful line that's not contact info, title, or company)
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    
    if (usedLines.has(i)) continue;
    
    // Skip contact info lines
    if (line.includes('@') || phoneRegex.test(line) || 
        (parsedData.website && line.toLowerCase().includes(parsedData.website.toLowerCase()))) {
      continue;
    }
    
    // Name heuristics: should be relatively short, contain letters, possibly spaces
    if (line.length > 2 && line.length < 50 && 
        /^[A-Za-z\s\.\-']+$/.test(line) && // Only letters, spaces, dots, hyphens, apostrophes
        !parsedData.name) {
      parsedData.name = line;
      usedLines.add(i);
      break;
    }
  }
  
  // Third pass: Fill in missing company with remaining meaningful lines
  if (!parsedData.company) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (usedLines.has(i)) continue;
      
      // Skip contact info lines
      if (line.includes('@') || phoneRegex.test(line) || 
          (parsedData.website && line.toLowerCase().includes(parsedData.website.toLowerCase()))) {
        continue;
      }
      
      // Company heuristics: not too short, not a person's name format
      if (line.length > 3 && 
          (line === line.toUpperCase() || // All caps
           line.split(' ').length <= 4) && // Not too many words
          line !== parsedData.name) {
        parsedData.company = line;
        usedLines.add(i);
        break;
      }
    }
  }
  
  // Enhanced address extraction
  const addressKeywords = ['street', 'st', 'avenue', 'ave', 'road', 'rd', 'suite', 'floor', 
                           'building', 'blvd', 'drive', 'dr', 'lane', 'ln', 'way', 'plaza', 'place'];
  let addressLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (usedLines.has(i)) continue;
    
    const lowerLine = line.toLowerCase();
    
    // Look for address patterns
    const hasAddressKeyword = addressKeywords.some(keyword => lowerLine.includes(keyword));
    const hasNumber = /\d/.test(line);
    const isZipCode = /\b\d{5}(-\d{4})?\b/.test(line);
    const isCityState = /[A-Z][a-z]+,\s*[A-Z]{2}\s*\d{5}/.test(line);
    
    if ((hasAddressKeyword && hasNumber) || isZipCode || isCityState) {
      addressLines.push(line);
      usedLines.add(i);
      
      // Check next line for continuation
      if (i + 1 < lines.length && !usedLines.has(i + 1)) {
        const nextLine = lines[i + 1];
        if (/[A-Z][a-z]+,\s*[A-Z]{2}\s*\d{5}/.test(nextLine) || 
            /\b\d{5}(-\d{4})?\b/.test(nextLine)) {
          addressLines.push(nextLine);
          usedLines.add(i + 1);
        }
      }
    }
  }
  
  // If no specific address found, use remaining lines as potential address
  if (addressLines.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (usedLines.has(i)) continue;
      
      // Skip obvious non-address lines
      if (line.includes('@') || phoneRegex.test(line) || line.length < 5) {
        continue;
      }
      
      // Potential address line
      if (/\d/.test(line) || line.split(' ').length >= 2) {
        addressLines.push(line);
        usedLines.add(i);
      }
    }
  }
  
  if (addressLines.length > 0) {
    parsedData.address = addressLines.join(', ');
  }
  
  console.log('Final parsed data:', parsedData);
  return parsedData;
}
