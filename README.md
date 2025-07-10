# Business Card OCR - Vercel Deployment

A Progressive Web App for extracting contact information from business cards using multiple OCR engines and AI-powered parsing.

## 🌟 Features

- 📱 **PWA** - Works on mobile and desktop, installable offline
- 🔍 **Multi-OCR** - Amazon Textract (primary), Google Cloud Vision (fallback)
- 🤖 **AI Parsing** - Groq/Llama for intelligent field extraction
- 📷 **Camera Capture** - Take photos directly in the app
- 💬 **Comments** - Add notes to each scanned card
- 📊 **Table View** - See all extracted data in organized format
- 📄 **PDF Export** - Download results as PDF for later reference
- 🎨 **Modern UI** - Clean professional design with Tailwind CSS

## 🚀 Live Demo

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Sidreyas/Business-Card-App)

## 🛠 Tech Stack

- **Frontend**: React + Tailwind CSS + PWA
- **Backend**: Vercel Serverless Functions (Python)
- **OCR Engines**: Amazon Textract (primary), Google Cloud Vision (fallback)
- **AI Parsing**: Groq API (Llama 3.3-70B)
- **PDF Generation**: jsPDF + autoTable
- **Deployment**: Vercel

## ⚙️ Environment Variables

Set these environment variables in Vercel dashboard:

### Required - Groq API (AI Parsing)
```bash
GROQ_API_KEY=your_groq_api_key_here
```

### Required - AWS Textract (Primary OCR)
```bash
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
```

### Optional - Google Cloud Vision (Fallback OCR)
```bash
GOOGLE_APPLICATION_CREDENTIALS=base64_encoded_service_account_json
```

## 🚀 Deployment Steps

### 1. Get API Keys

**Groq API (Required)**
1. Sign up at [console.groq.com](https://console.groq.com)
2. Create an API key
3. Copy the key for environment variables

**AWS Textract (Required)**
1. Create AWS account
2. Go to IAM → Users → Create User
3. Attach policy: `AmazonTextractFullAccess`
4. Create access key for the user
5. Copy Access Key ID and Secret Access Key

**Google Cloud Vision (Optional)**
1. Create Google Cloud project
2. Enable Vision API
3. Create service account
4. Download JSON key file
5. Encode it as base64: `base64 -i service-account.json`

### 2. Deploy to Vercel

**Option A: One-Click Deploy**
1. Click the "Deploy with Vercel" button above
2. Connect your GitHub account
3. Configure environment variables
4. Deploy!

**Option B: Manual Deploy**
1. Fork this repository
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### 3. Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add the required variables:
   - `GROQ_API_KEY`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `GOOGLE_APPLICATION_CREDENTIALS` (optional)

## 📱 Usage

1. **Enter Name**: App asks for your name on first use
2. **Capture/Upload**: Use camera or upload business card image
3. **AI Processing**: Automatic OCR and intelligent field extraction
4. **Add Comments**: Review data and add notes
5. **View Results**: Organized table with all scanned cards
6. **Export PDF**: Download professional reports

## 🏗 Project Structure

```
├── src/                    # React application
│   ├── components/         # React components
│   │   ├── UploadForm.jsx  # Camera/upload interface
│   │   ├── DataTable.jsx   # Results display
│   │   └── CommentModal.jsx# Comment dialog
│   └── App.js             # Main application
├── api/                   # Vercel serverless functions
│   └── upload.py         # OCR processing endpoint
├── public/               # Static assets
│   ├── manifest.json    # PWA manifest
│   └── service-worker.js# PWA service worker
├── vercel.json          # Vercel configuration
└── requirements.txt     # Python dependencies
```

## 🔧 Local Development

1. Clone the repository:
```bash
git clone https://github.com/Sidreyas/Business-Card-App.git
cd Business-Card-App
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

4. Run development server:
```bash
npm start
```

## 🌐 API Endpoints

- `POST /api/upload` - Process business card image
  - Input: Multipart form data with image file
  - Output: Extracted text and structured data

## 📊 Data Flow

1. User uploads/captures business card image
2. Vercel serverless function processes with OCR
3. AI parsing extracts structured fields
4. Frontend displays results in organized table
5. User can add comments and export PDF

## 🔒 Security & Privacy

- No image data is permanently stored
- All processing happens server-side
- Environment variables are securely managed by Vercel
- HTTPS encryption for all data transmission

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Submit pull request

## 📞 Support

For issues and questions:
- Open GitHub issue
- Check environment variables setup
- Verify API key permissions

---

Made with ❤️ for efficient business card digitization
