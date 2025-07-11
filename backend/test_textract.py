#!/usr/bin/env python3
import os
import boto3
from dotenv import load_dotenv
from botocore.exceptions import ClientError, NoCredentialsError

# Load environment variables
load_dotenv()

def test_textract_setup():
    """Test Amazon Textract setup and credentials"""
    
    # Check environment variables
    aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
    aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
    aws_region = os.getenv('AWS_REGION', 'us-east-1')
    
    print("🔍 Testing Amazon Textract Setup...")
    print(f"AWS Region: {aws_region}")
    print(f"AWS Access Key: {'✅ Set' if aws_access_key else '❌ Not set'}")
    print(f"AWS Secret Key: {'✅ Set' if aws_secret_key else '❌ Not set'}")
    
    # Try to initialize Textract client
    try:
        if aws_access_key and aws_secret_key:
            client = boto3.client(
                'textract',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=aws_region
            )
            print("✅ Textract client initialized with explicit credentials")
        else:
            client = boto3.client('textract', region_name=aws_region)
            print("✅ Textract client initialized with default credentials")
        
        # Test the connection with a simple API call
        try:
            # This will test if we can make API calls
            response = client.get_document_text_detection(JobId="dummy-job-id")
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'InvalidJobIdException':
                print("✅ AWS Textract API is accessible (dummy job ID test passed)")
                return True
            else:
                print(f"❌ AWS API Error: {error_code} - {e.response['Error']['Message']}")
                return False
        except Exception as e:
            print(f"❌ Unexpected error: {str(e)}")
            return False
            
    except NoCredentialsError:
        print("❌ AWS credentials not found. Please set up AWS credentials.")
        print("\n📝 To set up AWS credentials, you have several options:")
        print("1. Set environment variables in .env file:")
        print("   AWS_ACCESS_KEY_ID=your_access_key")
        print("   AWS_SECRET_ACCESS_KEY=your_secret_key")
        print("   AWS_REGION=us-east-1")
        print("\n2. Use AWS CLI: aws configure")
        print("3. Use IAM roles (if running on AWS)")
        return False
    except Exception as e:
        print(f"❌ Error initializing Textract client: {str(e)}")
        return False

def test_textract_with_sample():
    """Test Textract with a sample image"""
    try:
        # Create a simple test image (minimal text)
        from PIL import Image, ImageDraw, ImageFont
        import io
        
        # Create a simple business card-like image
        img = Image.new('RGB', (400, 200), color='white')
        draw = ImageDraw.Draw(img)
        
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
        except:
            font = ImageFont.load_default()
        
        draw.text((20, 20), "John Doe", fill='black', font=font)
        draw.text((20, 50), "Software Engineer", fill='black', font=font)
        draw.text((20, 80), "TechCorp Inc.", fill='black', font=font)
        draw.text((20, 110), "john.doe@techcorp.com", fill='black', font=font)
        draw.text((20, 140), "+1 (555) 123-4567", fill='black', font=font)
        
        # Convert to bytes
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='PNG')
        img_data = img_buffer.getvalue()
        
        # Test Textract
        aws_region = os.getenv('AWS_REGION', 'us-east-1')
        client = boto3.client('textract', region_name=aws_region)
        
        response = client.detect_document_text(
            Document={'Bytes': img_data}
        )
        
        # Extract text
        text_lines = []
        for item in response['Blocks']:
            if item['BlockType'] == 'LINE':
                text_lines.append(item['Text'])
        
        extracted_text = '\n'.join(text_lines)
        print("✅ Textract test successful!")
        print(f"Extracted text:\n{extracted_text}")
        return True
        
    except Exception as e:
        print(f"❌ Textract test failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Amazon Textract Integration Test\n")
    
    setup_ok = test_textract_setup()
    
    if setup_ok:
        print("\n🧪 Testing with sample image...")
        test_textract_with_sample()
    else:
        print("\n❌ Setup failed. Please configure AWS credentials first.")
        
    print("\n" + "="*50)
    print("💡 Benefits of Amazon Textract for Business Cards:")
    print("✅ Superior text extraction accuracy")
    print("✅ Better handling of various fonts and layouts") 
    print("✅ Automatic text orientation correction")
    print("✅ Cost-effective for document processing")
    print("✅ No need for billing setup (pay-per-use)")
