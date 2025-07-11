# Business Card OCR PWA

A Progressive Web App for extracting contact information from business cards using multiple OCR engines and AI-powered parsing.

## 🌟 Features

- 📱 **PWA** - Works on mobile and desktop, installable offline
- 🔍 **Multi-OCR** - Amazon Textract (primary), Google Cloud Vision, Tesseract (fallbacks)
- 🤖 **AI Parsing** - Groq/Llama for intelligent field extraction
- 📷 **Camera Capture** - Take photos directly in the app
- 💬 **Comments** - Add notes to each scanned card
- 📊 **Table View** - See all extracted data in organized format
- 📄 **PDF Export** - Download results as PDF for later reference
- 🎨 **Modern UI** - Black & white gradient theme with Tailwind CSS

## 🛠 Tech Stack

- **Frontend**: React + Tailwind CSS + PWA
- **Backend**: Flask + Amazon Textract + Google Cloud Vision + Tesseract
- **AI Parsing**: Groq API (Llama 3.3-70B)
- **PDF Generation**: jsPDF + autoTable
- **OCR Engines**: Amazon Textract (primary), Google Cloud Vision (fallback), Tesseract (final fallback)

## 🚀 Quick Start

### Prerequisites
- Node.js and npm
- Python 3.8+
- AWS credentials (for Textract)
- Google Cloud credentials (optional, for Vision API fallback)
- Groq API key (for AI parsing)

### 1. Setup Environment
```bash
# Clone or extract the project
cd Card_OCR

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your API keys and credentials
```

### 2. Start Backend (Terminal 1)
```bash
cd backend
# Install dependencies
pip install -r requirements.txt
# Start server
python app.py
```

### 3. Start Frontend (Terminal 2)
```bash
cd frontend
# Install dependencies
npm install
# Start development server
npm start
```

### 4. Open App
Visit `http://localhost:3000` in your browser

## 📱 Usage

1. **Upload Image**: Click "Select Image" or "Use Camera" to capture/select a business card
2. **Extract Text**: Click "Upload & Extract" to process the image with OCR
3. **AI Parsing**: The system automatically extracts structured data (name, email, phone, etc.)
4. **Add Comment**: Enter notes about the card in the popup dialog
5. **View Results**: See all extracted data in the organized table
6. **Export PDF**: Click "Export PDF" to download all results

## 🔧 Configuration

### Environment Variables (.env)
```bash
# AWS Textract (Primary OCR)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_DEFAULT_REGION=us-east-1

# Google Cloud Vision (Fallback OCR)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Groq AI (Intelligent Parsing)
GROQ_API_KEY=your_groq_api_key
```

## 🏗 Architecture

### OCR Pipeline
1. **Amazon Textract** (Primary) - Superior accuracy for business cards
2. **Google Cloud Vision** (Fallback) - Backup OCR service
3. **Tesseract** (Final Fallback) - Local OCR processing

### AI Parsing
- **Groq API** with Llama 3.3-70B model
- Intelligent field extraction from raw OCR text
- Handles OCR errors and formatting issues
- Structured JSON output with validated fields

### Frontend Architecture
- **React Components**: UploadForm, DataTable, CommentModal
- **State Management**: useState hooks for data flow
- **PWA Features**: Service worker, offline capability, installable
- **Responsive Design**: Tailwind CSS with mobile-first approach

## 🎨 UI Theme

The app features a modern black & white gradient design:
- **Background**: Radial gradient from gray to black
- **Cards**: Translucent white with subtle shadows
- **Buttons**: Gradient backgrounds with hover effects
- **Typography**: Clean hierarchy with proper contrast
- **Icons**: Consistent emoji-based iconography

## 📊 Data Flow

1. User uploads/captures image
2. Backend processes with OCR (Textract → Vision → Tesseract)
3. Raw text sent to Groq AI for intelligent parsing
4. Structured data returned to frontend
5. User adds comment via modal
6. Data stored in browser state and displayed in table
7. PDF export generates formatted document

## 🚀 Development Timeline (Completed)

✅ **Phase 1**: Project setup, React frontend, Tailwind CSS  
✅ **Phase 2**: Flask backend, Google Cloud Vision integration  
✅ **Phase 3**: PWA features, service worker, camera capture  
✅ **Phase 4**: AI parsing with Groq/DeepSeek integration  
✅ **Phase 5**: Amazon Textract integration (primary OCR)  
✅ **Phase 6**: UI enhancement with black & white gradient theme  
✅ **Phase 7**: Final testing and optimization  
✅ **Hour 7-8**: PDF export, PWA setup, final testing

## Project Structure

```
Card_OCR/
├── frontend/                 # React PWA
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── App.js          # Main app component
│   │   └── index.js        # Entry point
│   ├── public/
│   │   ├── manifest.json   # PWA manifest
│   │   └── service-worker.js
│   └── package.json
├── backend/                 # Flask API
│   ├── app.py              # Main Flask app
│   ├── requirements.txt    # Python dependencies
│   └── start.sh           # Startup script
└── business-card-*.json    # Google Cloud credentials
```

## Current Status: 90% Complete ✅

**What's Working:**
- ✅ Full React frontend with Tailwind CSS
- ✅ PWA configuration (installable)
- ✅ Flask backend with Google Cloud Vision
- ✅ Image upload and OCR processing
- ✅ Comment dialog system
- ✅ Data table with results
- ✅ PDF export functionality
- ✅ Responsive design

**Ready for Production!** 🚀
