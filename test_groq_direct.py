#!/usr/bin/env python3

import os
import sys
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test the Groq API directly
def test_groq_api():
    api_key = os.getenv('GROQ_API_KEY')
    if not api_key:
        print("ERROR: GROQ_API_KEY not found in environment variables")
        return False
    
    print(f"API Key exists: {api_key[:10]}...")
    
    try:
        client = Groq(api_key=api_key)
        
        test_text = """John Smith
Senior Software Engineer
TechCorp Solutions Inc.
john.smith@techcorp.com
+1 (555) 123-4567
www.techcorp.com
123 Business Ave, Suite 100
San Francisco, CA 94105"""

        prompt = f"""You are an expert business card information extractor. Parse the following OCR text and return ONLY a valid JSON object with these exact fields: name, title, company, email, phone, website, address.

Rules:
1. Handle OCR errors, typos, and formatting issues intelligently
2. If a field is not found, use empty string ""
3. Fix common OCR mistakes (like 0 instead of O)
4. Return ONLY the JSON object, no other text
5. Ensure valid JSON format

OCR Text:
{test_text}

JSON:"""

        print("Sending request to Groq...")
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,
            max_tokens=500,
            timeout=15
        )
        
        ai_response = response.choices[0].message.content.strip()
        print("AI Response:")
        print(ai_response)
        print("\n" + "="*50)
        
        return True
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    test_groq_api()
