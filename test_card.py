#!/usr/bin/env python3
"""
Simple script to create a test business card image for testing OCR functionality.
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_test_business_card():
    # Create a business card image
    width, height = 600, 350
    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    
    try:
        # Try to use a larger font if available
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", 28)
        font_medium = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", 20)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", 16)
    except:
        # Fallback to default font
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Add business card content
    y_pos = 30
    
    # Name
    draw.text((30, y_pos), "John Smith", fill='black', font=font_large)
    y_pos += 40
    
    # Title
    draw.text((30, y_pos), "Senior Software Engineer", fill='gray', font=font_medium)
    y_pos += 35
    
    # Company
    draw.text((30, y_pos), "TechCorp Solutions Inc.", fill='black', font=font_medium)
    y_pos += 40
    
    # Email
    draw.text((30, y_pos), "📧 john.smith@techcorp.com", fill='blue', font=font_small)
    y_pos += 30
    
    # Phone
    draw.text((30, y_pos), "📱 +1 (555) 123-4567", fill='blue', font=font_small)
    y_pos += 30
    
    # Website
    draw.text((30, y_pos), "🌐 www.techcorp.com", fill='blue', font=font_small)
    y_pos += 30
    
    # Address
    draw.text((30, y_pos), "📍 123 Business Ave, Suite 100", fill='gray', font=font_small)
    draw.text((30, y_pos + 20), "    San Francisco, CA 94105", fill='gray', font=font_small)
    
    # Add a border
    draw.rectangle([10, 10, width-10, height-10], outline='gray', width=2)
    
    # Save the image
    output_path = '/home/maverick/Documents/PROJECTS/Card_OCR/test_business_card.png'
    img.save(output_path)
    print(f"Test business card saved to: {output_path}")
    return output_path

if __name__ == "__main__":
    create_test_business_card()
