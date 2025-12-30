# Deployment Guide - Vercel

## Prerequisites

1. **GitHub Account** - You'll need a GitHub repository for your code
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com) (free)
3. **Supabase Database** - Make sure your Supabase project is set up and the SQL migrations are run

## Step 1: Push Code to GitHub

If you haven't already, initialize git and push to GitHub:

```bash
cd betting-app

# Initialize git (if not already done)
git init

# Create .gitignore if it doesn't exist
# Make sure it includes:
# node_modules
# dist
# .env
# .env.local

# Add all files
git add .

# Commit
git commit -m "Initial commit - Betting app with leaderboard toggle"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Click **"Import Git Repository"**
4. Select your GitHub repository
5. Configure your project:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (or leave blank)
   - **Build Command**: `npm run build` (should be auto-detected)
   - **Output Directory**: `dist` (should be auto-detected)

6. **Add Environment Variables** (CRITICAL):
   Click "Environment Variables" and add:
   - `VITE_SUPABASE_URL` = Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon/public key

7. Click **"Deploy"**

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (run from the betting-app directory)
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (Select your account)
# - Link to existing project? No
# - What's your project's name? betting-app
# - In which directory is your code located? ./
# - Want to override the settings? No

# Add environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

## Step 3: Configure Supabase

After deployment, you need to allow your Vercel domain in Supabase:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Add your Vercel URL to **Site URL**: `https://your-app.vercel.app`
4. Add your Vercel URL to **Redirect URLs**: `https://your-app.vercel.app/**`

## Step 4: Run Database Migrations

Make sure you've run the SQL migration in your Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `create_app_settings_table.sql`
3. Paste and run it

## Environment Variables

Your app needs these environment variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these:**
- Supabase Dashboard → Settings → API
- URL: Project URL
- Anon Key: anon/public key

## Troubleshooting

### Build Fails

**Error: Environment variables not found**
- Make sure you added `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel

**TypeScript errors**
- Run `npm run build` locally first to catch errors
- Fix any TypeScript errors before deploying

### App Deployed but Not Working

**Cannot connect to Supabase**
- Check environment variables in Vercel dashboard
- Make sure Supabase URL is added to allowed URLs

**Blank page**
- Check browser console for errors
- Verify environment variables are set correctly

**Authentication not working**
- Add Vercel URL to Supabase redirect URLs
- Check that Site URL is configured in Supabase

### Real-time Updates Not Working

- Supabase real-time should work automatically
- Make sure Row Level Security (RLS) policies are set up correctly
- Check browser console for websocket connection errors

## Custom Domain (Optional)

To add a custom domain:

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions
4. Update Supabase redirect URLs to include your custom domain

## Redeployment

Every time you push to the `main` branch on GitHub, Vercel will automatically redeploy your app.

To manually redeploy:
- Vercel Dashboard → Deployments → Select deployment → "Redeploy"
- Or: `vercel --prod` from command line

## Production Checklist

- [ ] Database migrations run in Supabase
- [ ] Environment variables set in Vercel
- [ ] Vercel URL added to Supabase redirect URLs
- [ ] App deployed and accessible
- [ ] Test login/authentication
- [ ] Test creating matches (admin)
- [ ] Test placing bets
- [ ] Test real-time updates
- [ ] Test leaderboard visibility toggle
- [ ] Test all features work in production

## Support

If you encounter issues:
- Check [Vercel Documentation](https://vercel.com/docs)
- Check [Supabase Documentation](https://supabase.com/docs)
- Vercel build logs: Project → Deployments → Click deployment → View logs
