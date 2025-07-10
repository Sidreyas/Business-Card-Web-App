import json

def handler(request):
    """Simple handler for Vercel"""
    
    # Return a simple test response
    result = {
        'text': 'Test OCR response',
        'parsed_data': {
            'name': 'Test Name',
            'title': 'Test Title',
            'company': 'Test Company',
            'email': 'test@example.com',
            'phone': '123-456-7890',
            'website': 'test.com',
            'address': 'Test Address'
        },
        'success': True
    }
    
    # Return with CORS headers
    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Content-Type": "application/json"
        },
        "body": json.dumps(result)
    }
