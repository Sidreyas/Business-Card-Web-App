#!/usr/bin/env python3
import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()

def test_groq_api():
    api_key = os.getenv('GROQ_API_KEY')
    if not api_key:
        print("❌ GROQ_API_KEY not found in environment")
        return False
    
    print(f"✅ Found GROQ_API_KEY: {api_key[:10]}...")
    
    try:
        client = Groq(api_key=api_key)
        
        # Test with a simple business card OCR text
        test_ocr_text = """
        John Smith
        Software Engineer
        ABC Technology
        john.smith@abc.com
        +1 (555) 123-4567
        123 Main St, San Francisco, CA 94105
        """
        
        completion = client.chat.completions.create(
            model="deepseek-r1-distill-llama-70b",
            messages=[
                {
                    "role": "user",
                    "content": f"""Extract business card information from this OCR text and return ONLY a JSON object with these fields:
                    {{
                        "name": "",
                        "title": "",
                        "company": "",
                        "email": "",
                        "phone": "",
                        "address": ""
                    }}
                    
                    OCR Text: {test_ocr_text}"""
                }
            ],
            temperature=0.1,
            max_tokens=500
        )
        
        response = completion.choices[0].message.content
        print("✅ Groq API test successful!")
        print("Response:", response)
        return True
        
    except Exception as e:
        print(f"❌ Groq API test failed: {str(e)}")
        return False

if __name__ == "__main__":
    test_groq_api()
