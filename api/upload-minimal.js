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
function extractBusinessCardInfo(text) {
  const parsedData = {
    name: '',
    title: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    address: ''
  };

  if (!text || text.includes("Unable to extract") || text.includes("Error processing")) {
    return parsedData;
  }
  
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
    const nonEmailMatches = websiteMatches.filter(match => !match.includes('@'));
    
    if (nonEmailMatches.length > 0) {
      let website = nonEmailMatches[0];
      
      const validTLDs = ['com', 'net', 'org', 'io', 'co', 'gov', 'edu'];
      const bestMatches = nonEmailMatches.filter(match => {
        const domain = match.split('.').pop().toLowerCase();
        return validTLDs.includes(domain);
      });
      
      if (bestMatches.length > 0) {
        website = bestMatches[0];
      }
      
      if (!website.startsWith('http') && !website.startsWith('www.')) {
        website = 'www.' + website;
      }
      
      parsedData.website = website;
    }
  }
  
  // Split the text into lines
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  // Extract name, title, company from first few lines
  let lineIndex = 0;
  
  // Skip lines that are obviously not names (emails, phones, websites)
  while (lineIndex < lines.length) {
    const line = lines[lineIndex].trim();
    if (!line.includes('@') && !line.includes('www.') && !/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(line)) {
      if (!parsedData.name) {
        parsedData.name = line;
      } else if (!parsedData.title) {
        parsedData.title = line;
      } else if (!parsedData.company) {
        parsedData.company = line;
        break;
      }
    }
    lineIndex++;
  }
  
  // Extract address
  const addressKeywords = ['street', 'st', 'avenue', 'ave', 'road', 'rd', 'suite', 'floor', 'building'];
  let addressLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    if (/\b\d+\s+[A-Za-z0-9\s,]+/.test(line) && 
        addressKeywords.some(keyword => lowerLine.includes(keyword)) && 
        !lowerLine.includes('@')) {
      addressLines.push(line.trim());
      
      // Check next line for city/state/zip
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (/[A-Z][a-z]+,\s*[A-Z]{2}\s+\d{5}/.test(nextLine)) {
          addressLines.push(nextLine.trim());
        }
      }
      break;
    }
  }
  
  if (addressLines.length > 0) {
    parsedData.address = addressLines.join(', ');
  }
  
  return parsedData;
}
