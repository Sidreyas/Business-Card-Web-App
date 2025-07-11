#!/usr/bin/env python3
"""
Test script for rule-based business card parsing
"""

import sys
import os
sys.path.append('/home/maverick/Documents/PROJECTS/Card_OCR/backend')

from app import extract_business_card_info

def test_business_card_parsing():
    """Test the rule-based parsing with sample business card text"""
    
    test_cases = [
        {
            "name": "Standard Business Card",
            "text": """
            John Smith
            Senior Software Engineer
            TechCorp Solutions Inc
            john.smith@techcorp.com
            (555) 123-4567
            www.techcorp.com
            123 Technology Lane
            Silicon Valley, CA 94105
            """
        },
        {
            "name": "OCR with Errors",
            "text": """
            Jane D0e
            Marketing Manager
            Innovate LLC
            jane@inn0vate.c0m
            555-987-6543
            inn0vate.com
            456 Business St, Suite 200
            New York, NY 10001
            """
        },
        {
            "name": "Minimal Information",
            "text": """
            Bob Wilson
            CEO
            StartupXYZ
            bob@startupxyz.com
            +1-555-111-2222
            """
        }
    ]
    
    print("Testing Rule-Based Business Card Parsing")
    print("=" * 50)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\nTest Case {i}: {test_case['name']}")
        print("-" * 30)
        print("Input text:")
        print(test_case['text'])
        
        # Extract info using rule-based parsing
        result = extract_business_card_info(test_case['text'])
        
        print("\nExtracted Information:")
        for field, value in result.items():
            if field != 'raw_text' and value:
                print(f"  {field.capitalize()}: {value}")
        
        print("\n" + "=" * 50)

if __name__ == "__main__":
    test_business_card_parsing()
