// Enhanced upload API with database integration
// /api/upload-db.js

const multer = require('multer');
const { insertBusinessCardEntry } = require('./lib/database');

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// OCR.space API integration
async function performOCR(imageBuffer) {
  try {
    const https = require('https');
    const querystring = require('querystring');
    
    // Check image size (OCR.space has limits)
    const imageSizeKB = imageBuffer.length / 1024;
    console.log(`Image size: ${imageSizeKB.toFixed(2)} KB`);
    
    if (imageSizeKB > 1024) {
      console.warn('Image size exceeds 1MB, may cause OCR issues');
    }
    
    // Convert image buffer to base64
    const base64Image = imageBuffer.toString('base64');
    console.log(`Base64 image length: ${base64Image.length}`);
    
    // Prepare form data as URL-encoded string
    const postData = querystring.stringify({
      'base64Image': `data:image/jpeg;base64,${base64Image}`,
      'apikey': process.env.OCR_SPACE_API_KEY || 'K87899142388957',
      'language': 'eng',
      'isOverlayRequired': 'false',
      'detectOrientation': 'true',
      'scale': 'true',
      'OCREngine': '2'
    });
    
    console.log('Sending OCR request to OCR.space API...');

    // Promise wrapper for https request
    const response = await new Promise((resolve, reject) => {
      const req = https.request('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 30000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log('OCR API Response Status:', res.statusCode);
          console.log('OCR API Raw Response:', data.substring(0, 500)); // Log first 500 chars
          
          // Check if response is HTML (error page) instead of JSON
          if (data.trim().startsWith('<') || data.trim().startsWith('<!')) {
            reject(new Error('OCR API returned HTML error page instead of JSON'));
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            console.error('JSON Parse Error:', e.message);
            console.error('Raw response that failed to parse:', data);
            reject(new Error(`Invalid JSON response: ${e.message}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('OCR API Request Error:', error);
        reject(error);
      });
      
      req.on('timeout', () => {
        console.error('OCR API Request Timeout');
        reject(new Error('Request timeout'));
      });
      
      req.write(postData);
      req.end();
    });

    console.log('OCR API Response:', JSON.stringify(response, null, 2));

    if (response.OCRExitCode !== 1) {
      const errorMsg = response.ErrorMessage || response.ErrorDetails || 'Unknown OCR error';
      console.error('OCR API Error:', errorMsg);
      throw new Error(`OCR failed: ${errorMsg}`);
    }

    const extractedText = response.ParsedResults?.[0]?.ParsedText || '';
    if (!extractedText.trim()) {
      throw new Error('No text extracted from image');
    }

    return {
      text: extractedText,
      method: 'ocr_space',
      success: true
    };

  } catch (error) {
    console.error('OCR failed:', error);
    
    // Return a structured error response that can be handled gracefully
    return {
      text: `OCR extraction failed: ${error.message}`,
      method: 'ocr_space',
      success: false,
      error: error.message,
      fallback: true
    };
  }
}

// Enhanced business card parsing with OCR error handling
function parseBusinessCard(text) {
  if (!text || text.trim() === '') {
    return {
      name: '',
      title: '',
      company: '',
      email: '',
      phone: '',
      website: '',
      address: ''
    };
  }

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const info = {
    name: '',
    title: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    address: ''
  };

  // Enhanced regex patterns
  const phonePattern = /(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}[-.\s]?\d{8,15})/;
  const emailPattern = /\b[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z0-9]{2,}\b/;
  const websitePattern = /(https?:\/\/[^\s]+|www\.[^\s]+\.[a-z]{2,}|[a-zA-Z0-9-]+\.[a-z]{2,})/i;

  // Title keywords
  const titleKeywords = [
    'CEO', 'CTO', 'CFO', 'COO', 'President', 'Director', 'Manager', 'Senior', 'Lead',
    'Engineer', 'Developer', 'Designer', 'Analyst', 'Consultant', 'Specialist',
    'Executive', 'Vice President', 'VP', 'Assistant', 'Coordinator', 'Supervisor'
  ];

  // Company indicators
  const companyIndicators = [
    'Inc', 'Corp', 'LLC', 'Ltd', 'Company', 'Co.', 'Solutions', 'Services', 
    'Systems', 'Technologies', 'Tech', 'Group', 'Associates'
  ];

  const usedLines = new Set();

  // Extract contact info first
  lines.forEach((line, index) => {
    // Email
    const emailMatch = line.match(emailPattern);
    if (emailMatch && !info.email) {
      info.email = emailMatch[0];
      usedLines.add(index);
      return;
    }

    // Phone
    const phoneMatch = line.match(phonePattern);
    if (phoneMatch && !info.phone) {
      info.phone = phoneMatch[0];
      usedLines.add(index);
      return;
    }

    // Website
    const websiteMatch = line.match(websitePattern);
    if (websiteMatch && !info.website && !line.includes('@')) {
      let website = websiteMatch[0];
      if (!website.startsWith('http') && !website.startsWith('www.')) {
        website = 'www.' + website;
      }
      info.website = website;
      usedLines.add(index);
      return;
    }
  });

  // Extract title and company
  lines.forEach((line, index) => {
    if (usedLines.has(index)) return;

    // Check for title keywords
    const hasTitle = titleKeywords.some(keyword => 
      line.toLowerCase().includes(keyword.toLowerCase())
    );
    if (hasTitle && !info.title) {
      info.title = line;
      usedLines.add(index);
      return;
    }

    // Check for company indicators
    const hasCompany = companyIndicators.some(indicator => 
      line.toLowerCase().includes(indicator.toLowerCase())
    );
    if (hasCompany && !info.company) {
      info.company = line;
      usedLines.add(index);
      return;
    }
  });

  // Extract name (first meaningful line that's not used)
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    if (usedLines.has(i)) continue;
    
    const line = lines[i];
    if (line.length > 2 && line.length < 50 && 
        /^[A-Za-z0-9\s\.\-']+$/.test(line) && 
        line.split(' ').length >= 1) {
      info.name = line;
      usedLines.add(i);
      break;
    }
  }

  // Extract company if not found
  if (!info.company) {
    for (let i = 0; i < lines.length; i++) {
      if (usedLines.has(i)) continue;
      
      const line = lines[i];
      if (line.length > 3 && (line.toUpperCase() === line || line.split(' ').length <= 4)) {
        info.company = line;
        usedLines.add(i);
        break;
      }
    }
  }

  // Extract address from remaining lines
  const remainingLines = lines.filter((_, index) => !usedLines.has(index));
  if (remainingLines.length > 0) {
    info.address = remainingLines.join(', ');
  }

  return info;
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

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart form data
    const uploadMiddleware = upload.single('image');
    
    await new Promise((resolve, reject) => {
      uploadMiddleware(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Get user info from request  
    const userName = req.body.username || req.body.userName || 'Anonymous';
    const userComment = req.body.comment || '';

    // Perform OCR
    console.log('Performing OCR on uploaded image...');
    const ocrResult = await performOCR(req.file.buffer);

    // Handle OCR failure gracefully
    if (!ocrResult.success) {
      console.log('OCR failed, returning error response with details');
      
      // If it's a fallback response, still try to parse whatever text we have
      if (ocrResult.fallback && ocrResult.text) {
        console.log('Using fallback OCR response');
        const parsedData = parseBusinessCard(ocrResult.text);
        
        return res.status(200).json({
          success: false,
          text: ocrResult.text,
          parsed_data: parsedData,
          ocr_method: ocrResult.method,
          parsing_method: 'rule_based',
          error: 'OCR service unavailable, manual entry required',
          ocr_error: ocrResult.error,
          saved_to_database: false
        });
      }
      
      return res.status(500).json({
        error: 'OCR failed',
        details: ocrResult.error,
        success: false,
        suggestions: [
          'Try a clearer image',
          'Ensure the business card is well-lit',
          'Make sure text is clearly visible',
          'Try a smaller file size'
        ]
      });
    }

    // Parse business card information
    console.log('Parsing business card information...');
    const parsedData = parseBusinessCard(ocrResult.text);

    // Save to database
    try {
      const dbEntry = {
        user_name: userName,
        ocr_text: ocrResult.text,
        ocr_method: ocrResult.method,
        parsing_method: 'rule_based',
        name: parsedData.name || '',
        title: parsedData.title || '',
        company: parsedData.company || '',
        email: parsedData.email || '',
        phone: parsedData.phone || '',
        website: parsedData.website || '',
        address: parsedData.address || '',
        user_comment: userComment,
        ocr_success: ocrResult.success,
        parsing_success: true
      };

      console.log('Saving to database with entry:', JSON.stringify(dbEntry, null, 2));
      const savedEntry = await insertBusinessCardEntry(dbEntry);
      
      console.log('Successfully saved entry with ID:', savedEntry.id, 'at:', savedEntry.created_at);

      return res.status(200).json({
        success: true,
        id: savedEntry.id,
        text: ocrResult.text,
        parsed_data: parsedData,
        ocr_method: ocrResult.method,
        parsing_method: 'rule_based',
        saved_to_database: true,
        created_at: savedEntry.created_at,
        user_name: savedEntry.user_name
      });

    } catch (dbError) {
      console.error('Database save failed:', dbError);
      
      // Return the OCR result even if database save fails
      return res.status(200).json({
        success: true,
        text: ocrResult.text,
        parsed_data: parsedData,
        ocr_method: ocrResult.method,
        parsing_method: 'rule_based',
        saved_to_database: false,
        database_error: dbError.message
      });
    }

  } catch (error) {
    console.error('Upload handler error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      success: false
    });
  }
}
