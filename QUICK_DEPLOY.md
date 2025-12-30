# Quick Deploy to Vercel - TL;DR

## 1. Push to GitHub

```bash
cd betting-app
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repo
4. Add environment variables:
   - `VITE_SUPABASE_URL` = Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key
5. Click "Deploy"

## 3. Configure Supabase

1. Supabase Dashboard → Authentication → URL Configuration
2. Add your Vercel URL:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/**`

## 4. Run Database Migration

1. Supabase Dashboard → SQL Editor
2. Run the SQL from `create_app_settings_table.sql`

## Done!

Visit your app at: `https://your-app.vercel.app`

---

**Need help?** See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.
