from http.server import BaseHTTPRequestHandler
import json
import os
import io
import re
import base64
import cgi
from urllib.parse import parse_qs

# Import OCR and AI libraries
try:
    from google.cloud import vision
    GOOGLE_VISION_AVAILABLE = True
except ImportError:
    GOOGLE_VISION_AVAILABLE = False

try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
    AWS_TEXTRACT_AVAILABLE = True
except ImportError:
    AWS_TEXTRACT_AVAILABLE = False

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

try:
    from PIL import Image, ImageEnhance, ImageFilter
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

def get_groq_client():
    """Initialize Groq client"""
    if not GROQ_AVAILABLE:
        return None
    
    api_key = os.environ.get('GROQ_API_KEY')
    if not api_key:
        return None
    return Groq(api_key=api_key)

def get_textract_client():
    """Initialize AWS Textract client"""
    if not AWS_TEXTRACT_AVAILABLE:
        return None
        
    aws_access_key = os.environ.get('AWS_ACCESS_KEY_ID')
    aws_secret_key = os.environ.get('AWS_SECRET_ACCESS_KEY')
    aws_region = os.environ.get('AWS_REGION', 'us-east-1')
    
    if aws_access_key and aws_secret_key:
        return boto3.client(
            'textract',
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key,
            region_name=aws_region
        )
    else:
        try:
            return boto3.client('textract', region_name=aws_region)
        except NoCredentialsError:
            return None

def extract_text_with_textract(image_data):
    """Extract text using Amazon Textract"""
    try:
        client = get_textract_client()
        if not client:
            return None
        
        response = client.detect_document_text(
            Document={'Bytes': image_data}
        )
        
        text = []
        for block in response['Blocks']:
            if block['BlockType'] == 'LINE':
                text.append(block['Text'])
        
        return '\n'.join(text)
    except Exception as e:
        print(f"Textract error: {e}")
        return None

def preprocess_image(image_data):
    """Preprocess image for better OCR results"""
    if not PIL_AVAILABLE:
        return image_data
    
    try:
        image = Image.open(io.BytesIO(image_data))
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Enhance image
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.5)
        
        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(2.0)
        
        output = io.BytesIO()
        image.save(output, format='JPEG', quality=95)
        return output.getvalue()
    except Exception as e:
        print(f"Image preprocessing error: {e}")
        return image_data

def extract_text_with_google_vision(image_data):
    """Extract text using Google Cloud Vision API"""
    if not GOOGLE_VISION_AVAILABLE:
        return None
    
    try:
        if not os.environ.get('GOOGLE_APPLICATION_CREDENTIALS'):
            return None
        
        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=image_data)
        
        response = client.text_detection(image=image)
        
        if response.error.message:
            raise Exception(f"Google Vision API error: {response.error.message}")
        
        if response.text_annotations:
            return response.text_annotations[0].description
        else:
            return ""
    except Exception as e:
        print(f"Google Vision error: {e}")
        return None

def parse_business_card_with_ai(raw_text):
    """Parse business card text using Groq AI"""
    if not GROQ_AVAILABLE:
        return {}
    
    try:
        client = get_groq_client()
        if not client:
            return {}
        
        prompt = f"""
        Extract the following information from this business card text. Return ONLY a JSON object with these exact keys:
        - name: person's full name
        - title: job title/position
        - company: company name
        - email: email address
        - phone: phone number
        - website: website URL
        - address: physical address
        
        If any information is not found, use an empty string for that field.
        Do not include any explanatory text, just the JSON object.
        
        Business card text:
        {raw_text}
        """
        
        response = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=500
        )
        
        ai_response = response.choices[0].message.content.strip()
        
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
        if json_match:
            json_str = json_match.group()
            parsed_data = json.loads(json_str)
            return parsed_data
        else:
            return {}
    except Exception as e:
        print(f"AI parsing error: {e}")
        return {}

def perform_ocr_with_ai_parsing(image_data):
    """Perform OCR and AI parsing on business card image"""
    try:
        # Preprocess the image
        processed_image = preprocess_image(image_data)
        
        # Try multiple OCR methods
        raw_text = None
        
        # Try Google Vision first
        raw_text = extract_text_with_google_vision(processed_image)
        
        # Fall back to Textract if Google Vision fails
        if not raw_text:
            raw_text = extract_text_with_textract(processed_image)
        
        if not raw_text:
            return {
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
                'success': False,
                'error': 'OCR failed - no text could be extracted'
            }
        
        # Parse the text with AI
        parsed_data = parse_business_card_with_ai(raw_text)
        
        # Ensure all required fields are present
        required_fields = ['name', 'title', 'company', 'email', 'phone', 'website', 'address']
        for field in required_fields:
            if field not in parsed_data:
                parsed_data[field] = ''
        
        return {
            'text': raw_text,
            'parsed_data': parsed_data,
            'success': True
        }
    except Exception as e:
        print(f"OCR processing error: {e}")
        return {
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
            'success': False,
            'error': str(e)
        }

class BusinessCardOCRServer(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        try:
            content_type = self.headers.get('Content-Type', '')
            
            if 'multipart/form-data' in content_type:
                # Parse multipart form data
                form = cgi.FieldStorage(
                    fp=self.rfile,
                    headers=self.headers,
                    environ={'REQUEST_METHOD': 'POST'}
                )
                
                if 'image' not in form:
                    self.send_error_response(400, 'No image file provided')
                    return
                
                image_field = form['image']
                if not image_field.filename:
                    self.send_error_response(400, 'No file selected')
                    return
                
                # Read image data
                image_data = image_field.file.read()
                
                # Perform OCR with AI parsing
                result = perform_ocr_with_ai_parsing(image_data)
                
                self.send_success_response(result)
            else:
                self.send_error_response(400, 'Content-Type must be multipart/form-data')
        
        except Exception as e:
            print(f"Handler error: {e}")
            error_result = {
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
            }
            self.send_error_response(500, error_result)

    def send_success_response(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def send_error_response(self, status_code, error_data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        if isinstance(error_data, str):
            error_data = {'error': error_data}
        
        self.wfile.write(json.dumps(error_data).encode())

# Vercel serverless function handler
def handler(request):
    """Main handler for Vercel serverless function"""
    try:
        # Create a simple HTTP server to handle the request
        server = BusinessCardOCRServer()
        
        # Mock the request for our server
        if request.method == 'POST':
            server.do_POST()
        elif request.method == 'OPTIONS':
            server.do_OPTIONS()
        else:
            return {
                'statusCode': 405,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                'body': json.dumps({'error': 'Method not allowed'})
            }
            
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            'body': json.dumps({'success': True})
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            'body': json.dumps({'error': str(e)})
        }
