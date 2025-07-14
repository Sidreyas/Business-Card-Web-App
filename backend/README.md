# Business Card OCR Backend

Express.js backend server for Business Card OCR application, designed for deployment on Render.

## 🚀 Quick Deploy to Render

### 1. Create New Web Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Select this `backend` folder as the root directory

### 2. Configure Render Settings
```
Build Command: npm install
Start Command: npm start
Environment: Node
```

### 3. Set Environment Variables
Add these environment variables in Render:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_6Iw3VlgyBxuT@ep-soft-term-a1u2u4q6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
OCR_SPACE_API_KEY=helloworld
PORT=5000
```

### 4. Update Frontend Configuration
After deployment, update your frontend's `src/config/api.js`:

```javascript
export const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://YOUR-RENDER-APP-NAME.onrender.com/api'  // Replace with actual URL
    : 'http://localhost:5000/api',
  TIMEOUT: 60000,
};
```

## 🛠 Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Test API endpoints:**
   ```bash
   npm test
   ```

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/init-db` | Initialize database |
| GET | `/api/check-username?username=X` | Check username availability |
| POST | `/api/check-username` | Create new username |
| GET | `/api/entries?userName=X` | Get user's card entries |
| POST | `/api/upload-db` | Upload and process business card |
| POST | `/api/update-entry` | Update card entry comment |

## 🔧 Features

- ✅ Image upload and OCR processing
- ✅ Business card data parsing
- ✅ PostgreSQL database integration
- ✅ User management system
- ✅ CORS enabled for frontend
- ✅ File size limits (20MB)
- ✅ Error handling and logging
- ✅ Health monitoring

## 📊 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL (Neon)
- **OCR:** OCR.space API
- **File Upload:** Multer
- **Deployment:** Render

## 🐛 Troubleshooting

### Common Issues:

1. **Database Connection Failed**
   - Check `DATABASE_URL` environment variable
   - Verify Neon database is accessible

2. **OCR Processing Timeout**
   - Images too large (>20MB)
   - OCR.space API limits reached

3. **CORS Errors**
   - Update `corsOptions.origin` in `server.js`
   - Add your frontend domain

### Logs and Monitoring:
- Check Render logs for detailed error messages
- Use `/health` endpoint to verify service status

## 🚀 Deployment Checklist

- [ ] Repository connected to Render
- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] Frontend API URL updated
- [ ] CORS origins configured
- [ ] Health check passing

---

**Ready to deploy!** 🎉

Once deployed, your backend will be available at:
`https://your-app-name.onrender.com`
