# 🌐 Free Deployment Guide

Deploy your clinic scheduling system for **$0/month** using free tiers.

## 🎯 Recommended Stack (100% Free)

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **Neon.tech** | PostgreSQL Database | 0.5GB storage |
| **Railway.app** | Backend API | $5 credit/month |
| **Vercel** | Frontend | Unlimited |

**Total Cost**: $0/month (Railway credit renews monthly)

---

## Step 1: Deploy Database (Neon.tech)

### 1.1 Create Account
1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub
3. Click "Create Project"

### 1.2 Setup Database
1. **Project name**: `clinic-scheduling`
2. **Region**: Choose closest to you
3. **PostgreSQL version**: 16
4. Click "Create Project"

### 1.3 Get Connection String
1. Click "Connection Details"
2. Copy the connection string (looks like):
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Save this - you'll need it!

### 1.4 Run Migrations
```bash
# Install PostgreSQL client (if needed)
brew install postgresql  # macOS
apt-get install postgresql-client  # Linux

# Run migration
psql "postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require" \
  -f database/migrations/001_initial_schema.sql
```

✅ **Database is ready!**

---

## Step 2: Deploy Backend (Railway.app)

### 2.1 Create Account
1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project"

### 2.2 Deploy from GitHub
1. Click "Deploy from GitHub repo"
2. Select your repository
3. Click "Deploy Now"

### 2.3 Configure Service
1. Click on the deployed service
2. Go to "Settings" tab
3. **Root Directory**: `/backend`
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `npm start`

### 2.4 Add Environment Variables
1. Go to "Variables" tab
2. Add these variables:
   ```
   NODE_ENV=production
   DATABASE_URL=<your-neon-connection-string>
   PORT=3000
   ```
3. Click "Add" for each

### 2.5 Generate Domain
1. Go to "Settings" → "Networking"
2. Click "Generate Domain"
3. Copy the URL (e.g., `https://clinic-scheduling.railway.app`)

✅ **Backend is live!**

**Test it:**
```bash
curl https://your-app.railway.app/health
```

---

## Step 3: Deploy Frontend (Vercel)

### 3.1 Create Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New..." → "Project"

### 3.2 Import Repository
1. Select your repository
2. Click "Import"

### 3.3 Configure Build
1. **Framework Preset**: Vite
2. **Root Directory**: `frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`

### 3.4 Add Environment Variable
1. Click "Environment Variables"
2. Add:
   ```
   VITE_API_URL=https://your-app.railway.app
   ```
3. Click "Add"

### 3.5 Deploy
1. Click "Deploy"
2. Wait 2-3 minutes
3. Click on the generated URL

✅ **Frontend is live!**

---

## Step 4: Update Backend CORS

### 4.1 Add Frontend URL to Backend
1. Go to Railway dashboard
2. Click on your backend service
3. Go to "Variables"
4. Add:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```

### 4.2 Redeploy
Railway will automatically redeploy with the new variable.

---

## 🎉 You're Done!

Your app is now live at:
- **Frontend**: https://your-app.vercel.app
- **Backend**: https://your-app.railway.app
- **API Docs**: https://your-app.railway.app/api-docs

---

## Alternative: Render.com (All-in-One)

If you prefer a single platform:

### Database
1. Create PostgreSQL database on Render
2. Free tier: 90-day retention
3. Note internal connection string

### Backend
1. New Web Service
2. Connect GitHub repo
3. Root: `/backend`
4. Build: `npm install && npm run build`
5. Start: `npm start`
6. Add environment variables

### Frontend
1. New Static Site
2. Root: `/frontend`
3. Build: `npm run build`
4. Publish: `dist`

---

## 🔧 Post-Deployment Checklist

- [ ] Test health endpoint: `/health`
- [ ] Test API docs: `/api-docs`
- [ ] Test tenant switching in UI
- [ ] Create a test appointment
- [ ] Verify database has data
- [ ] Set up error monitoring (optional)
- [ ] Enable database backups (Neon auto-backups)

---

## 📊 Monitoring

### Railway
- View logs: Dashboard → Service → "Logs" tab
- View metrics: Dashboard → Service → "Metrics" tab

### Vercel
- View deployments: Dashboard → Project → "Deployments"
- View analytics: Dashboard → Project → "Analytics"

### Neon
- View queries: Dashboard → Project → "Queries"
- View storage: Dashboard → Project → "Storage"

---

## 🐛 Common Issues

### Backend won't start
```bash
# Check logs in Railway
# Common issues:
# - Wrong DATABASE_URL format
# - Missing environment variables
# - Build errors

# Fix: Verify all environment variables are set
```

### Frontend can't connect to backend
```bash
# Check VITE_API_URL is correct
# Must be the Railway URL, not localhost

# Fix: Update environment variable in Vercel
# Redeploy: Vercel → Deployments → "Redeploy"
```

### Database connection failed
```bash
# Check Neon connection string
# Must include ?sslmode=require

# Test connection:
psql "your-connection-string" -c "SELECT 1"
```

### CORS errors
```bash
# Backend must allow frontend domain
# Check FRONTEND_URL in Railway

# Add to backend environment variables:
FRONTEND_URL=https://your-app.vercel.app
```

---

## 💰 Cost Breakdown

| Service | Free Tier | Limits | Upgrade Cost |
|---------|-----------|--------|--------------|
| **Neon** | 0.5GB | 1 project | $19/mo for 10GB |
| **Railway** | $5 credit | Renews monthly | $5/mo after credit |
| **Vercel** | Unlimited | 100GB bandwidth | $20/mo for team |

**Total**: $0/month for this assessment! 🎉

---

## 🚀 Scaling Up

When you need more:

### Option 1: Stay on Free Tier
- Optimize queries
- Add Redis caching (Upstash free tier)
- Use Vercel Edge Functions

### Option 2: Upgrade Database
- Neon Pro: $19/mo (10GB, better performance)
- Supabase Pro: $25/mo (8GB, includes auth)

### Option 3: Move to VPS
- DigitalOcean: $4/mo (1GB RAM)
- Hetzner: €4/mo (2GB RAM)
- Deploy everything on one server

---

## 📚 Additional Resources

- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [Neon Docs](https://neon.tech/docs)

---

## 🆘 Need Help?

1. Check Railway logs
2. Check Vercel deployment logs
3. Test API endpoints with curl
4. Verify environment variables
5. Check database connection

**Still stuck?** The issue is usually:
- Wrong environment variable
- Missing DATABASE_URL
- CORS not configured
- Database migration not run

---

**Good luck with your interview! 🎯**

