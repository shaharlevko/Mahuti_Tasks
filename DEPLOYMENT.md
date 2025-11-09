# Deployment Guide - Mahuti Tasks

## Frontend Deployment on Vercel (Free)

### Prerequisites
- GitHub account
- Vercel account (sign up at vercel.com with GitHub)
- Your backend API URL (Supabase-connected backend)

### Step 1: Push Code to GitHub

Your code needs to be on GitHub for Vercel to deploy it.

```bash
# If not already committed, commit your changes
git add .
git commit -m "Prepare frontend for Vercel deployment"
git push
```

### Step 2: Deploy to Vercel

**Option A: Using Vercel Dashboard (Easiest)**

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your `Mahuti_Tasks` repository
4. Configure the project:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)

5. Add Environment Variables:
   - Click "Environment Variables"
   - Add: `VITE_API_URL` = `https://your-backend-url/api`
   - (Replace with your actual backend URL)

6. Click "Deploy"

**Option B: Using Vercel CLI**

```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to frontend directory
cd frontend

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - What's your project's name? mahuti-tasks
# - In which directory is your code located? ./
# - Want to override settings? No

# After first deployment, you'll need to add environment variables:
vercel env add VITE_API_URL

# Then redeploy
vercel --prod
```

### Step 3: Configure Environment Variables

In Vercel Dashboard (https://vercel.com/dashboard):
1. Go to your project
2. Click "Settings" → "Environment Variables"
3. Add the following:

   **For Production:**
   - **Key**: `VITE_API_URL`
   - **Value**: Your backend API URL (e.g., `https://your-backend.herokuapp.com/api`)
   - **Environment**: Production

   - **Key**: `VITE_SHOW_DEMO`
   - **Value**: `false` (hides demo button in production)
   - **Environment**: Production

   **For Preview/Development:**
   - **Key**: `VITE_API_URL`
   - **Value**: Your staging backend URL or `http://localhost:3001/api`
   - **Environment**: Preview, Development

   - **Key**: `VITE_SHOW_DEMO`
   - **Value**: `true` (shows demo button for testing)
   - **Environment**: Preview, Development

4. Redeploy if needed (or Vercel will auto-deploy on next push)

### Step 4: Get Your Public URL

After deployment:
- Vercel provides a URL like: `https://mahuti-tasks-xyz123.vercel.app`
- You can also add a custom domain in Settings → Domains

### Step 5: Test Your Deployment

1. Visit your Vercel URL
2. Check browser console for any API connection errors
3. Test login and task assignment functionality
4. Verify data is syncing with your Supabase backend

---

## Backend Deployment Options

If you haven't deployed your backend yet, here are free options:

### Option 1: Render (Recommended for Express + Supabase)

**Free Tier**: 750 hours/month, sleeps after 15min inactivity

1. Create `render.yaml` in backend directory:
```yaml
services:
  - type: web
    name: mahuti-backend
    env: node
    buildCommand: npm install
    startCommand: node src/server.js
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_KEY
        sync: false
      - key: JWT_SECRET
        sync: false
```

2. Push to GitHub
3. Go to https://render.com/new → Web Service
4. Connect your GitHub repo, select `backend` folder
5. Add environment variables
6. Deploy

### Option 2: Railway

**Free Tier**: $5 credit/month

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repo
4. Set root directory to `backend`
5. Add environment variables
6. Deploy

### Option 3: Fly.io

**Free Tier**: 3 shared VMs, good for low traffic

1. Install Fly CLI
2. `cd backend`
3. `fly launch`
4. Follow prompts
5. `fly deploy`

---

## Environment Variables Reference

### Frontend (.env in /frontend)
```
# Backend API URL (required)
VITE_API_URL=https://your-backend-url/api

# Show demo button (optional, defaults to true)
VITE_SHOW_DEMO=false
```

### Backend (.env in /backend)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
JWT_SECRET=your-secret-key
PORT=3001
```

---

## Troubleshooting

### CORS Errors
If you see CORS errors in the browser console, ensure your backend has proper CORS configuration:

```javascript
app.use(cors({
  origin: ['https://your-vercel-app.vercel.app', 'http://localhost:5173'],
  credentials: true
}));
```

### API Connection Failed
- Check that `VITE_API_URL` is set correctly in Vercel
- Verify your backend is running (visit backend URL in browser)
- Check browser console for error messages

### Build Fails on Vercel
- Ensure `package.json` in frontend has all dependencies
- Check Vercel build logs for specific errors
- Verify Node version compatibility (Vercel uses Node 18 by default)

---

## Managing Multiple Environments

### Production vs Testing/Staging

Vercel makes it easy to maintain separate environments:

**1. Production Environment** (your main public site)
- Automatically deploys from your `main` branch
- Set `VITE_SHOW_DEMO=false` to hide demo button
- Use production backend URL

**2. Preview/Staging Environment** (for testing)
- Automatically created for every PR or branch
- Set `VITE_SHOW_DEMO=true` to show demo button
- Can use staging backend URL

### How to Set Up:

#### Option 1: Single Deployment with Environment-Specific Variables

In Vercel Dashboard:
1. Go to Settings → Environment Variables
2. Add variables with different values per environment:
   - Production: `VITE_SHOW_DEMO=false`
   - Preview: `VITE_SHOW_DEMO=true`
   - Development: `VITE_SHOW_DEMO=true`

#### Option 2: Separate Projects (Recommended for Strict Separation)

Create two separate Vercel projects:

**Production Project:**
```
Name: mahuti-tasks-production
Branch: main
Environment Variables:
  VITE_API_URL=https://api.mahuti.com/api
  VITE_SHOW_DEMO=false
```

**Staging Project:**
```
Name: mahuti-tasks-staging
Branch: develop
Environment Variables:
  VITE_API_URL=https://api-staging.mahuti.com/api
  VITE_SHOW_DEMO=true
```

### Branch Strategy:

```
main (production)
  ↓
develop (staging)
  ↓
feature branches (preview)
```

- Merge features to `develop` → auto-deploy to staging
- Merge `develop` to `main` → auto-deploy to production

---

## Next Steps After Deployment

1. **Custom Domain**: Add your own domain in Vercel Settings
2. **Analytics**: Enable Vercel Analytics for usage insights
3. **Monitoring**: Set up Supabase monitoring for backend health
4. **Backups**: Configure Supabase automatic backups
5. **Security**: Review Supabase Row Level Security (RLS) policies

---

## Cost Breakdown (All Free Tier)

- **Vercel Frontend**: Free (100GB bandwidth/month)
- **Supabase Database**: Free (500MB storage, 2GB transfer)
- **Render Backend**: Free (750 hours/month, sleeps when idle)

**Total Monthly Cost**: $0

---

## Questions?

Check the logs:
- Vercel: Dashboard → Your Project → Deployments → Click deployment → Logs
- Render: Dashboard → Your Service → Logs tab
- Supabase: Dashboard → Your Project → Database → Logs
