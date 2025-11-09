# Deployment Guide - Mahuti Tasks (Supabase Only)

This application uses **Supabase** for both database and authentication, and deploys the frontend to **Vercel**.

## Architecture

```
Frontend (Vercel) → Supabase (Database + Auth)
```

**No Express backend needed!** Everything runs through Supabase.

---

## Step 1: Set Up Supabase

### 1.1 Get Your Supabase Credentials

You should already have these from your local setup:

1. Go to your Supabase project dashboard
2. Go to **Settings** → **API**
3. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### 1.2 Ensure Your Database is Set Up

Make sure your Supabase database has all the required tables:
- `users`
- `staff`
- `tasks`
- `schedules`
- `schedule_assignments`
- `invitations`

If you need to run the migration, use the SQL from `backend/supabase-migration.sql`.

---

## Step 2: Deploy Frontend to Vercel

### Option A: Using Vercel Dashboard (Recommended)

1. **Go to** https://vercel.com/new
2. **Import** your GitHub repository
3. **Configure project settings:**
   - **Root Directory**: `frontend`
   - **Framework**: Vite (auto-detected)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)

4. **Add Environment Variables:**

   Click "Environment Variables" and add:

   | Key | Value | Environment |
   |-----|-------|-------------|
   | `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview, Development |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` (your anon key) | Production, Preview, Development |
   | `VITE_SHOW_DEMO` | `false` | Production |
   | `VITE_SHOW_DEMO` | `true` | Preview, Development |

5. **Click "Deploy"**

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend
cd frontend

# Deploy
vercel

# After deployment, add environment variables via dashboard
# Then redeploy:
vercel --prod
```

---

## Step 3: Configure Supabase Authentication

### 3.1 Add Site URL

In your Supabase Dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Add your Vercel URL to **Site URL**: `https://your-app.vercel.app`
3. Add to **Redirect URLs**:
   - `https://your-app.vercel.app/**`
   - `http://localhost:5173/**` (for local dev)

### 3.2 Enable Google OAuth (Optional)

If using Google login:

1. Go to **Authentication** → **Providers**
2. Enable **Google**
3. Add your Google OAuth credentials
4. Add authorized redirect URI: `https://xxxxx.supabase.co/auth/v1/callback`

---

## Step 4: Set Up Row Level Security (RLS)

To secure your database, you need to enable RLS policies. Run this SQL in your Supabase SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Users: can read their own data
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Staff: authenticated users can view all staff
CREATE POLICY "Authenticated users can view staff"
  ON staff FOR SELECT
  TO authenticated
  USING (true);

-- Staff: admin and manager can insert/update/delete
CREATE POLICY "Admins and managers can manage staff"
  ON staff FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Tasks: authenticated users can view all tasks
CREATE POLICY "Authenticated users can view tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

-- Tasks: admin and manager can insert/update/delete
CREATE POLICY "Admins and managers can manage tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Schedules: authenticated users can view all schedules
CREATE POLICY "Authenticated users can view schedules"
  ON schedules FOR SELECT
  TO authenticated
  USING (true);

-- Schedules: authenticated users can create schedules
CREATE POLICY "Authenticated users can create schedules"
  ON schedules FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Schedule Assignments: authenticated users can view all
CREATE POLICY "Authenticated users can view assignments"
  ON schedule_assignments FOR SELECT
  TO authenticated
  USING (true);

-- Schedule Assignments: admin and manager can insert/update/delete
CREATE POLICY "Admins and managers can manage assignments"
  ON schedule_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Invitations: only admins can manage
CREATE POLICY "Admins can manage invitations"
  ON invitations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
```

---

## Step 5: Test Your Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Try to log in or register
3. Test creating staff, tasks, and assignments
4. Verify permissions work correctly

---

## Environment Variables Reference

### Frontend (.env in /frontend)

```bash
# Supabase Configuration (required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Show demo button (optional, defaults to true)
VITE_SHOW_DEMO=false
```

---

## Troubleshooting

### "Missing Supabase environment variables" Error

- Make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in Vercel
- Redeploy after adding environment variables

### Login Fails / "Invalid API key" Error

- Check that your Supabase anon key is correct
- Ensure Supabase project is not paused (free tier pauses after 1 week of inactivity)

### "Permission denied" Errors

- Make sure you've enabled RLS policies (see Step 4)
- Check that your user has the correct role (admin/manager/staff)

### Can't Create Assignments

- Verify RLS policies are set up correctly
- Check browser console for specific error messages
- Ensure user has 'admin' or 'manager' role in the `users` table

---

## Cost Breakdown (All Free Tier)

- **Vercel Frontend**: Free (100GB bandwidth/month)
- **Supabase**: Free (500MB storage, 2GB transfer, 50,000 monthly active users)

**Total Monthly Cost**: $0

---

## Managing Multiple Environments

### Production vs Staging

**Option 1: Single Deployment with Environment-Specific Variables**

In Vercel Dashboard:
1. Set different values per environment:
   - Production: `VITE_SHOW_DEMO=false`
   - Preview: `VITE_SHOW_DEMO=true`

**Option 2: Separate Projects**

Create two Vercel projects:
- **mahuti-tasks-production** (main branch)
- **mahuti-tasks-staging** (develop branch)

---

## Next Steps

1. **Custom Domain**: Add your domain in Vercel Settings → Domains
2. **Analytics**: Enable Vercel Analytics
3. **Monitoring**: Set up Supabase monitoring and alerts
4. **Backups**: Configure Supabase automatic backups (paid feature)
5. **Security**: Review and test RLS policies thoroughly

---

## Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
