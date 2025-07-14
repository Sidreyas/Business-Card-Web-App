# Deployment Guide

This project consists of a React frontend and Express.js backend that need to be deployed separately.

## Architecture Overview

- **Frontend**: React app deployed on Vercel
- **Backend**: Express.js server deployed on Render
- **Database**: PostgreSQL hosted on Neon.tech

## Backend Deployment (Render)

### 1. Create New Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Web Service"
3. Connect your GitHub repository: `https://github.com/Sidreyas/Business-Card-Web-App`
4. Configure the service:
   - **Name**: `business-card-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 2. Environment Variables for Render

Set these environment variables in Render dashboard:

```bash
# Database
DATABASE_URL=postgresql://neondb_owner:XXXXXXXX@ep-XXXXXXXX.us-east-2.aws.neon.tech/neondb?sslmode=require

# OCR API
OCR_API_KEY=your_ocr_space_api_key_here

# CORS (will be updated after frontend deployment)
FRONTEND_URL=https://your-frontend-domain.vercel.app

# Port (Render sets this automatically)
PORT=10000
```

### 3. Get Backend URL

After deployment, Render will provide a URL like:
`https://business-card-backend-XXXXX.onrender.com`

## Frontend Deployment (Vercel)

### 1. Update API Configuration

Before deploying, update `src/config/api.js` with your Render backend URL:

```javascript
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://business-card-backend-XXXXX.onrender.com'  // Replace with your Render URL
  : 'http://localhost:5000';
```

### 2. Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository: `https://github.com/Sidreyas/Business-Card-Web-App`
4. Configure the project:
   - **Framework Preset**: Create React App
   - **Root Directory**: `./` (keep as root since React app is in root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

### 3. Environment Variables for Vercel

If needed, set these in Vercel dashboard:
```bash
REACT_APP_API_URL=https://business-card-backend-XXXXX.onrender.com
```

## Post-Deployment Steps

### 1. Update CORS Configuration

After frontend is deployed, update the `FRONTEND_URL` environment variable in Render with your Vercel URL:
```bash
FRONTEND_URL=https://your-app-name.vercel.app
```

### 2. Test the Application

1. Visit your Vercel frontend URL
2. Test username creation and validation
3. Test card upload and OCR functionality
4. Verify data is being stored in database

## Database Management

Your Neon PostgreSQL database is already set up with:
- Users table for storing usernames
- Entries table for card data
- Proper indexes and constraints

Current database contains 7 active users - the system is ready for production use.

## Important Notes

- **Cold Starts**: Render free tier has cold starts. First request after inactivity may take 30+ seconds
- **Database Connections**: Neon handles connection pooling automatically
- **File Uploads**: Images are processed via OCR.space API, not stored locally
- **HTTPS**: Both Render and Vercel provide HTTPS by default

## Monitoring

- **Render Logs**: Available in Render dashboard under "Logs" tab
- **Vercel Analytics**: Available in Vercel dashboard
- **Database Metrics**: Available in Neon console

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure `FRONTEND_URL` environment variable in Render matches your Vercel domain
2. **Database Connection**: Verify `DATABASE_URL` is correctly set in Render
3. **API Timeouts**: First request after cold start may timeout - this is normal on free tier

### Logs Access

- **Backend Logs**: Render Dashboard → Your Service → Logs
- **Frontend Logs**: Vercel Dashboard → Your Project → Functions tab for any API routes
- **Database Logs**: Neon Console → Your Database → Monitoring

## Scaling Considerations

- **Render**: Upgrade to paid plan for better performance and no cold starts
- **Vercel**: Pro plan for better analytics and performance
- **Database**: Neon automatically scales, but monitor connection limits

The application is now fully separated and ready for scalable cloud deployment!
