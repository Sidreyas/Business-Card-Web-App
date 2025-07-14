// Upload and OCR route for Express
// backend/routes/upload-db.js

const { insertBusinessCardEntry } = require('../lib/database');

// OCR.space API integration
async function performOCR(imageBuffer) {
  const FormData = require('form-data');
  const axios = require('axios');
  
  try {
    const form = new FormData();
    form.append('file', imageBuffer, {
      filename: 'business_card.jpg',
      contentType: 'image/jpeg'
    });
    form.append('language', 'eng');
    form.append('isOverlayRequired', 'false');
    form.append('detectOrientation', 'true');
    form.append('scale', 'true');
    form.append('OCREngine', '2');

    const response = await axios.post('https://api.ocr.space/parse/image', form, {
      headers: {
        ...form.getHeaders(),
        'apikey': process.env.OCR_SPACE_API_KEY || 'helloworld', // Use free API key as fallback
      },
      timeout: 30000,
    });

    if (response.data && response.data.ParsedResults && response.data.ParsedResults.length > 0) {
      const parsedText = response.data.ParsedResults[0].ParsedText;
      if (parsedText && parsedText.trim().length > 0) {
        return {
          success: true,
          text: parsedText.trim(),
          method: 'ocr_space'
        };
      }
    }

    throw new Error('No text extracted from OCR.space');
  } catch (error) {
    console.error('OCR.space failed:', error.message);
    throw error;
  }
}

// Enhanced business card parsing
function parseBusinessCard(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const parsed = {
    name: '',
    title: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    rawText: text
  };

  // Email regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  
  // Enhanced phone regex
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})|(\+\d{1,3}[-.\s]?)?\d{8,15}/g;
  
  // Enhanced website regex
  const websiteRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?/g;
  
  // Enhanced title keywords
  const titleKeywords = [
    'CEO', 'CTO', 'CFO', 'COO', 'President', 'Director', 'Manager', 'Senior', 'Lead', 
    'Engineer', 'Developer', 'Designer', 'Analyst', 'Consultant', 'Specialist', 
    'Executive', 'Vice President', 'VP', 'Assistant', 'Coordinator', 'Supervisor',
    'Partner', 'Founder', 'Owner', 'Principal', 'Chief', 'Head', 'Administrator'
  ];
  
  // Enhanced company indicators
  const companyIndicators = [
    'Inc', 'Corp', 'Corporation', 'LLC', 'Ltd', 'Limited', 'Company', 'Co.',
    'Solutions', 'Services', 'Systems', 'Technologies', 'Tech', 'Group', 'Associates',
    'Partners', 'Consulting', 'Holdings', 'Enterprises', 'International', 'Global'
  ];

  lines.forEach((line, index) => {
    // Extract email
    const emailMatch = line.match(emailRegex);
    if (emailMatch && !parsed.email) {
      parsed.email = emailMatch[0];
      return;
    }

    // Extract phone
    const phoneMatch = line.match(phoneRegex);
    if (phoneMatch && !parsed.phone) {
      parsed.phone = phoneMatch[0];
      return;
    }

    // Extract website
    const websiteMatch = line.match(websiteRegex);
    if (websiteMatch && !parsed.website && !line.includes('@')) {
      parsed.website = websiteMatch[0];
      return;
    }

    // Check if line contains title keywords
    const hasTitle = titleKeywords.some(keyword => 
      line.toLowerCase().includes(keyword.toLowerCase())
    );
    if (hasTitle && !parsed.title) {
      parsed.title = line;
      return;
    }

    // Check if line contains company indicators
    const hasCompanyIndicator = companyIndicators.some(indicator => 
      line.toLowerCase().includes(indicator.toLowerCase())
    );
    if (hasCompanyIndicator && !parsed.company) {
      parsed.company = line;
      return;
    }

    // Heuristic for name (usually first meaningful line)
    if (!parsed.name && line.length > 3 && line.length < 50 && 
        line.includes(' ') && index < 3 && 
        !line.includes('@') && !phoneMatch && !websiteMatch) {
      parsed.name = line;
      return;
    }

    // Heuristic for company (if not found by indicators)
    if (!parsed.company && line.length > 3 && 
        line === line.toUpperCase() && !line.includes('@') && !phoneMatch) {
      parsed.company = line;
      return;
    }
  });

  // Extract address from remaining lines
  const remainingLines = lines.filter(line => 
    line !== parsed.name && 
    line !== parsed.title && 
    line !== parsed.company && 
    line !== parsed.email && 
    line !== parsed.phone && 
    line !== parsed.website &&
    line.length > 5
  );
  
  if (remainingLines.length > 0) {
    parsed.address = remainingLines.join(', ');
  }

  return parsed;
}

// Express route handler
async function uploadHandler(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageBuffer = req.file.buffer;
    const userName = req.body.username || 'Anonymous';
    const userComment = req.body.comment || '';

    console.log('Processing OCR for user:', userName);
    console.log('Image size:', imageBuffer.length, 'bytes');

    // Perform OCR
    let ocrResult;
    try {
      ocrResult = await performOCR(imageBuffer);
      console.log('OCR successful:', ocrResult.method);
    } catch (ocrError) {
      console.error('OCR failed:', ocrError.message);
      return res.status(500).json({
        error: 'OCR processing failed',
        details: ocrError.message,
        success: false
      });
    }

    // Parse the extracted text
    const parsedData = parseBusinessCard(ocrResult.text);
    console.log('Parsing completed. Found name:', parsedData.name);

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

      console.log('Saving to database...');
      const savedEntry = await insertBusinessCardEntry(dbEntry);
      
      console.log('Successfully saved entry with ID:', savedEntry.id);

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
      
      // Return OCR result even if database save fails
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

module.exports = uploadHandler;
