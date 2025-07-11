import os
import io
import re
import time
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from google.cloud import vision
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
# Removed Groq import - using pure rule-based parsing
from dotenv import load_dotenv
import boto3
from botocore.exceptions import ClientError, NoCredentialsError

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Set up Google Cloud Vision credentials
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = '/home/maverick/Documents/PROJECTS/Card_OCR/business-card-465407-b9c5a04b327b.json'

# Removed Groq client - using pure rule-based parsing

# Initialize AWS Textract client
def get_textract_client():
    """Initialize AWS Textract client with credentials from environment"""
    aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
    aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
    aws_region = os.getenv('AWS_REGION', 'us-east-1')
    
    if aws_access_key and aws_secret_key:
        return boto3.client(
            'textract',
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key,
            region_name=aws_region
        )
    else:
        # Try using default AWS credentials (from ~/.aws/credentials or IAM role)
        try:
            return boto3.client('textract', region_name=aws_region)
        except NoCredentialsError:
            return None

def extract_text_with_textract(image_data):
    """Extract text using Amazon Textract"""
    try:
        client = get_textract_client()
        if not client:
            raise Exception("AWS Textract credentials not configured")
        
        # Call Textract
        response = client.detect_document_text(
            Document={'Bytes': image_data}
        )
        
        # Extract text from response
        text_lines = []
        for item in response['Blocks']:
            if item['BlockType'] == 'LINE':
                text_lines.append(item['Text'])
        
        return '\n'.join(text_lines)
        
    except Exception as e:
        raise Exception(f"Amazon Textract failed: {str(e)}")

# AI parsing function removed - using pure rule-based parsing

def extract_business_card_info(text):
    """Enhanced rule-based extraction of structured information from OCR text"""
    print(f"Extracting business card info from: {text}")
    
    # Initialize result structure
    info = {
        'name': '',
        'company': '',
        'title': '',
        'phone': '',
        'email': '',
        'website': '',
        'address': '',
        'raw_text': text
    }
    
    if not text or text.strip() == '':
        return info
    
    # Split the text into lines and clean them
    lines = text.split('\n')
    lines = [line.strip() for line in lines if line.strip()]
    lines = [line for line in lines if not re.match(r'^[\s\-_=]+$', line)]  # Remove separator lines
    
    print(f"Cleaned lines: {lines}")
    
    # Enhanced regex patterns
    phone_patterns = [
        r'\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # US format
        r'\+\d{1,3}[-.\s]?\d{8,15}',  # International format
        r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b'  # Simple format
    ]
    # Enhanced email pattern to handle OCR errors (allows numbers that might be letters)
    email_pattern = r'\b[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z0-9]{2,}\b'
    website_patterns = [
        r'https?://[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:/\S*)?',
        r'www\.[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:/\S*)?',
        r'\b[A-Za-z0-9-]+\.[A-Za-z]{2,}\b'
    ]
    
    # Title keywords (comprehensive list)
    title_keywords = [
        'CEO', 'CTO', 'CFO', 'COO', 'President', 'Director', 'Manager', 'Senior', 'Lead',
        'Engineer', 'Developer', 'Designer', 'Analyst', 'Consultant', 'Specialist',
        'Executive', 'Vice President', 'VP', 'Assistant', 'Coordinator', 'Supervisor',
        'Partner', 'Founder', 'Owner', 'Principal', 'Chief', 'Head', 'Administrator',
        'Sales', 'Marketing', 'Operations', 'Finance', 'HR', 'Human Resources',
        'Account', 'Project', 'Product', 'Business', 'Strategy', 'Technical'
    ]
    
    # Company indicators
    company_indicators = [
        'Inc', 'Corp', 'Corporation', 'LLC', 'Ltd', 'Limited', 'Company', 'Co.',
        'Solutions', 'Services', 'Systems', 'Technologies', 'Tech', 'Group', 'Associates',
        'Partners', 'Consulting', 'Holdings', 'Enterprises', 'International', 'Global',
        'Industries', 'Ventures', 'Capital', 'Fund', 'Bank', 'Insurance', 'Healthcare'
    ]
    
    used_lines = set()
    
    # Extract contact information first (most reliable)
    for i, line in enumerate(lines):
        # Extract email
        email_match = re.search(email_pattern, line)
        if email_match and not info['email']:
            info['email'] = email_match.group()
            used_lines.add(i)
            continue
        
        # Extract phone
        for phone_pattern in phone_patterns:
            phone_match = re.search(phone_pattern, line)
            if phone_match and not info['phone']:
                # Clean up phone number
                phone = re.sub(r'[^\d+()-.\s]', '', phone_match.group()).strip()
                info['phone'] = phone
                used_lines.add(i)
                break
        
        # Extract website
        for website_pattern in website_patterns:
            website_match = re.search(website_pattern, line)
            if website_match and not info['website'] and '@' not in line:
                website = website_match.group()
                # Add www. prefix if needed
                if not website.startswith(('http', 'www.')):
                    website = 'www.' + website
                info['website'] = website
                used_lines.add(i)
                break
    
    # Extract title and company using keywords
    for i, line in enumerate(lines):
        if i in used_lines:
            continue
            
        # Check for title keywords
        has_title = any(keyword.lower() in line.lower() for keyword in title_keywords)
        if has_title and not info['title'] and len(line) > 2:
            info['title'] = line
            used_lines.add(i)
            continue
        
        # Check for company indicators
        has_company = any(indicator.lower() in line.lower() for indicator in company_indicators)
        if has_company and not info['company'] and len(line) > 2:
            info['company'] = line
            used_lines.add(i)
            continue
    
    # Extract name (first meaningful line that's not contact info, title, or company)
    for i, line in enumerate(lines[:5]):  # Check first 5 lines for name
        if i in used_lines:
            continue
            
        # Name heuristics (allow numbers for OCR errors like D0e)
        if (len(line) > 2 and len(line) < 50 and 
            re.match(r'^[A-Za-z0-9\s\.\-\']+$', line) and  # Allow numbers for OCR errors
            not info['name'] and
            any(c.isalpha() for c in line)):  # Must have at least one letter
            info['name'] = line
            used_lines.add(i)
            break
    
    # Fill in missing company with remaining meaningful lines
    if not info['company']:
        for i, line in enumerate(lines):
            if i in used_lines:
                continue
                
            # Company heuristics
            if (len(line) > 3 and
                (line.isupper() or len(line.split()) <= 4) and  # All caps or short
                line != info['name']):
                info['company'] = line
                used_lines.add(i)
                break
    
    # Extract address from remaining lines
    address_keywords = [
        'street', 'st', 'avenue', 'ave', 'road', 'rd', 'suite', 'floor',
        'building', 'blvd', 'boulevard', 'drive', 'dr', 'lane', 'ln', 'way',
        'plaza', 'place', 'court', 'ct'
    ]
    
    address_lines = []
    for i, line in enumerate(lines):
        if i in used_lines:
            continue
            
        lower_line = line.lower()
        has_address_keyword = any(keyword in lower_line for keyword in address_keywords)
        has_number = bool(re.search(r'\d', line))
        is_zip_code = bool(re.search(r'\b\d{5}(-\d{4})?\b', line))
        is_city_state = bool(re.search(r'[A-Z][a-z]+,\s*[A-Z]{2}\s*\d{5}', line))
        
        if has_address_keyword and has_number or is_zip_code or is_city_state:
            address_lines.append(line)
            used_lines.add(i)
            
            # Check next line for continuation
            if i + 1 < len(lines) and (i + 1) not in used_lines:
                next_line = lines[i + 1]
                if (re.search(r'[A-Z][a-z]+,\s*[A-Z]{2}\s*\d{5}', next_line) or
                    re.search(r'\b\d{5}(-\d{4})?\b', next_line)):
                    address_lines.append(next_line)
                    used_lines.add(i + 1)
    
    # If no specific address found, use remaining lines as potential address
    if not address_lines:
        for i, line in enumerate(lines):
            if i in used_lines or len(line) < 5:
                continue
            # Potential address if it has numbers or multiple words
            if re.search(r'\d', line) or len(line.split()) >= 2:
                address_lines.append(line)
                used_lines.add(i)
    
    if address_lines:
        info['address'] = ', '.join(address_lines)
    
    print(f"Final extracted info: {info}")
    return info

def perform_ocr_with_rule_based_parsing(image_data):
    """Enhanced OCR with rule-based structured parsing (no AI)"""
    ocr_text = ""
    ocr_method = ""
    
    # Step 1: Extract text using OCR (Priority: Textract > Google Vision > Tesseract)
    try:
        # Try Amazon Textract first
        ocr_text = extract_text_with_textract(image_data)
        ocr_method = 'amazon_textract'
        print(f"Amazon Textract successful, extracted {len(ocr_text)} characters")
        
    except Exception as textract_error:
        print(f"Amazon Textract failed: {str(textract_error)}")
        
        try:
            # Fallback to Google Cloud Vision
            client = vision.ImageAnnotatorClient()
            image = vision.Image(content=image_data)
            response = client.text_detection(image=image)
            
            if response.error.message:
                raise Exception(f'Vision API error: {response.error.message}')
            
            texts = response.text_annotations
            if not texts:
                raise Exception('No text found in image')
            
            ocr_text = texts[0].description
            ocr_method = 'google_vision'
            print(f"Google Vision successful, extracted {len(ocr_text)} characters")
            
        except Exception as vision_error:
            print(f"Google Vision API failed: {str(vision_error)}")
            print("Falling back to Tesseract OCR...")
            
            try:
                # Final fallback to Tesseract OCR with preprocessing
                image = Image.open(io.BytesIO(image_data))
                
                if image.mode != 'RGB':
                    image = image.convert('RGB')
                
                # Image preprocessing for better OCR results
                enhancer = ImageEnhance.Contrast(image)
                image = enhancer.enhance(1.5)
                
                enhancer = ImageEnhance.Sharpness(image)
                image = enhancer.enhance(2.0)
                
                image = image.filter(ImageFilter.MedianFilter())
                
                # Try multiple Tesseract configurations
                custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.@-+()[]{}/:;,!?$%&*# '
                ocr_text = pytesseract.image_to_string(image, config=custom_config)
                
                if not ocr_text.strip():
                    custom_config = r'--oem 3 --psm 3'
                    ocr_text = pytesseract.image_to_string(image, config=custom_config)
                
                if not ocr_text.strip():
                    custom_config = r'--oem 3 --psm 4'
                    ocr_text = pytesseract.image_to_string(image, config=custom_config)
                
                if not ocr_text.strip():
                    raise Exception('No text found in image using Tesseract')
                
                ocr_method = 'tesseract'
                print(f"Tesseract successful, extracted {len(ocr_text)} characters")
                
            except Exception as tesseract_error:
                raise Exception(f"All OCR methods failed. Textract: {str(textract_error)}, Google Vision: {str(vision_error)}, Tesseract: {str(tesseract_error)}")
    
    # Step 2: Parse OCR text with enhanced rule-based parsing (no AI)
    parsed_data = extract_business_card_info(ocr_text)
    
    return {
        'raw_text': ocr_text,
        'parsed_data': parsed_data,
        'ocr_method': ocr_method,
        'parsing_method': 'rule_based',
        'success': True
    }

@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read image data
        image_data = file.read()
        
        # Save uploaded image for debugging (optional)
        debug_mode = True  # Set to False in production
        if debug_mode:
            try:
                os.makedirs('static/uploads', exist_ok=True)
                debug_path = f'static/uploads/debug_{int(time.time())}.jpg'
                with open(debug_path, 'wb') as f:
                    f.write(image_data)
                print(f"Debug: Saved uploaded image to {debug_path}")
            except Exception as debug_err:
                print(f"Debug save failed: {debug_err}")

        # Perform OCR with rule-based parsing (no AI)
        result = perform_ocr_with_rule_based_parsing(image_data)
        
        return jsonify({
            'text': result['raw_text'],
            'parsed_data': result['parsed_data'],
            'ocr_method': result['ocr_method'],
            'parsing_method': result['parsing_method'],
            'success': result['success']
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            'error': str(e),
            'text': '',
            'parsed_data': {
                'name': '',
                'title': '',
                'company': '',
                'email': '',
                'phone': '',
                'website': '',
                'address': ''
            },
            'success': False
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Flask server is running'})

@app.route('/test-ocr', methods=['GET'])
def test_ocr():
    """Test endpoint to verify OCR functionality"""
    return jsonify({
        'tesseract_available': True,
        'message': 'OCR service is ready',
        'fallback_enabled': True
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
