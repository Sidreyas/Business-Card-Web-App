# Business Card Web Application

A modern React web application that extracts text from business card images using OCR technology, with user management and data storage capabilities.

## 🚀 Features

- **OCR Text Extraction**: Upload business card images and extract text using OCR.space API
- **User Management**: Username creation and validation system
- **Data Storage**: Store extracted card data with PostgreSQL database
- **Modern UI**: Clean, responsive interface with Tailwind CSS
- **Real-time Processing**: Instant OCR processing and results display

## 🏗️ Architecture

- **Frontend**: React.js with Tailwind CSS (deployed on Vercel)
- **Backend**: Express.js API server (deployed on Render) 
- **Database**: PostgreSQL (hosted on Neon.tech)
- **OCR Service**: OCR.space API for text extraction

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- PostgreSQL database (we use Neon.tech)
- OCR.space API key

## �️ Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/Sidreyas/Business-Card-Web-App.git
cd Business-Card-Web-App
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 3. Environment Configuration

Create `.env` files for both frontend and backend:

**Backend `.env` (in `/backend` folder):**
```bash
DATABASE_URL=your_postgresql_connection_string
OCR_API_KEY=your_ocr_space_api_key
FRONTEND_URL=http://localhost:3000
PORT=5000
```

**Frontend `.env` (in root folder):**
```bash
REACT_APP_API_URL=http://localhost:5000
```

### 4. Database Setup

The database schema is automatically initialized when the backend starts. Tables created:
- `users`: Store usernames with unique constraints
- `entries`: Store extracted card data linked to users

### 5. Start Development Servers

```bash
# Start backend server (from /backend folder)
cd backend
npm run dev

# Start frontend development server (from root folder)
cd ..
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🌐 Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy Summary:

1. **Backend (Render)**:
   - Deploy `/backend` folder as Node.js web service
   - Set environment variables (DATABASE_URL, OCR_API_KEY, etc.)

2. **Frontend (Vercel)**:
   - Deploy root folder as Create React App
   - Update API URL in `src/config/api.js`

## 📡 API Endpoints

### User Management
- `POST /api/check-username` - Check if username is available
- `GET /api/entries/:username` - Get all entries for a user
- `PUT /api/update-entry/:id` - Update an entry

### OCR Processing
- `POST /api/upload-db` - Upload image, process OCR, and store data

## 🧪 Testing

```bash
# Run frontend tests
npm test

# Test backend API endpoints
cd backend
npm test
```

## 🔧 Project Structure

```
Business-Card-Web-App/
├── src/                          # React frontend source
│   ├── components/               # React components
│   │   ├── UploadForm.jsx       # Main upload interface
│   │   ├── UsernameDialog.jsx   # Username management
│   │   ├── DataTable.jsx        # Display extracted data
│   │   └── CommentModal.jsx     # Edit comments
│   ├── config/                  # Configuration files
│   │   └── api.js              # API URL configuration
│   └── App.js                  # Main React application
├── backend/                     # Express.js backend
│   ├── server.js               # Main server file
│   ├── routes/                 # API route handlers
│   └── lib/                    # Database utilities
├── database/                   # Database schema
└── public/                     # Static assets
```

## 🔑 Environment Variables

### Required for Backend:
- `DATABASE_URL`: PostgreSQL connection string
- `OCR_API_KEY`: OCR.space API key for text extraction

### Optional:
- `FRONTEND_URL`: For CORS configuration (production)
- `PORT`: Server port (defaults to 5000)

## 🐛 Common Issues & Solutions

### Development Issues:

1. **CORS Errors**: Ensure backend `FRONTEND_URL` matches frontend URL
2. **Database Connection**: Verify `DATABASE_URL` format and credentials
3. **OCR Failures**: Check `OCR_API_KEY` validity and API limits

### Production Issues:

1. **Cold Starts**: First request after inactivity may be slow (Render free tier)
2. **API Timeouts**: Increase timeout limits for OCR processing
3. **Database Limits**: Monitor connection count on Neon.tech

## 📊 Current Status

✅ **Fully Functional**: 
- User registration and validation
- OCR text extraction from business cards
- Data storage and retrieval
- Modern responsive UI

✅ **Production Ready**:
- Environment-based configuration
- Error handling and validation
- Database optimization
- CORS security

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Live Demo](https://your-app-name.vercel.app) (After deployment)
- [Backend API](https://business-card-backend-xxxxx.onrender.com) (After deployment)
- [Database Dashboard](https://console.neon.tech/)

## 💡 Tech Stack

- **Frontend**: React, Tailwind CSS, Create React App
- **Backend**: Node.js, Express.js, Multer
- **Database**: PostgreSQL (Neon.tech)
- **Deployment**: Vercel (Frontend), Render (Backend)
- **OCR**: OCR.space API
- **Version Control**: Git, GitHub

---

Built with ❤️ using modern web technologies for reliable business card text extraction.

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
