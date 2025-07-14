# Deployment Guide: French Baby Names App to Vercel + Supabase

This guide will walk you through deploying your French baby names application to Vercel with Supabase as the backend database.

## 🏗️ Architecture Overview

- **Frontend**: React + TypeScript + Vite (deployed on Vercel)
- **Backend**: Supabase (PostgreSQL database with built-in API)
- **Data**: French baby names from INSEE DS_PRENOM dataset
- **Features**: Search, trends, department mapping, AI recommendations

## 📋 Prerequisites

- Node.js 18+ installed
- Git repository
- Vercel account
- Supabase account

## 🚀 Step-by-Step Deployment

### Step 1: Create Supabase Project

1. **Go to [Supabase](https://supabase.com)** and create a new project
2. **Choose a project name** (e.g., "french-baby-names")
3. **Set a database password** and save it securely
4. **Wait for the project to be created** (takes 1-2 minutes)

### Step 2: Setup Database Schema

1. **Go to your Supabase dashboard** → SQL Editor
2. **Copy the contents** of `database/french-names-schema.sql`
3. **Paste and run the SQL** to create all tables, functions, and indexes
4. **Verify the setup** by checking the Tables tab - you should see:
   - `french_names`
   - `departments`
   - `name_statistics`

### Step 3: Get Supabase Credentials

1. **Go to Project Settings** → API
2. **Copy the following values**:
   - Project URL (e.g., `https://xxx.supabase.co`)
   - `anon` public key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)
   - `service_role` secret key (for migration only)

### Step 4: Setup Environment Variables

1. **Copy `env.deployment.example` to `.env.local`**:

   ```bash
   cp env.deployment.example .env.local
   ```

2. **Fill in your Supabase credentials**:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_KEY=your_service_key_here
   ```

### Step 5: Migrate Data to Supabase

1. **Make sure your CSV file exists**:

   ```bash
   ls data/DS_PRENOM_2024_DATA.CSV
   ```

2. **Run the migration script**:

   ```bash
   node scripts/migrate-to-supabase.js
   ```

3. **Wait for completion** (this may take 10-30 minutes depending on data size)
4. **Verify data** in Supabase dashboard → Table Editor

### Step 6: Deploy to Vercel

#### Option A: Deploy via Vercel CLI

1. **Install Vercel CLI**:

   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:

   ```bash
   vercel login
   ```

3. **Deploy the project**:

   ```bash
   vercel
   ```

4. **Set environment variables**:
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   vercel env add VITE_OPENAI_API_KEY  # Optional
   ```

#### Option B: Deploy via GitHub (Recommended)

1. **Push your code to GitHub**:

   ```bash
   git add .
   git commit -m "Add Supabase integration"
   git push origin main
   ```

2. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
3. **Click "New Project"**
4. **Import your GitHub repository**
5. **Configure environment variables**:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `VITE_OPENAI_API_KEY`: Your OpenAI key (optional)
6. **Deploy**

### Step 7: Verify Deployment

1. **Visit your deployed URL**
2. **Test the following features**:
   - ✅ Search for names (e.g., "Marie", "Pierre")
   - ✅ View name details with yearly data
   - ✅ Check department map functionality
   - ✅ Browse trending names
   - ✅ Test AI recommendations (if OpenAI key configured)

## 🔧 Configuration Options

### Environment Variables

| Variable                 | Required | Description                 |
| ------------------------ | -------- | --------------------------- |
| `VITE_SUPABASE_URL`      | ✅       | Your Supabase project URL   |
| `VITE_SUPABASE_ANON_KEY` | ✅       | Supabase anonymous key      |
| `VITE_OPENAI_API_KEY`    | ❌       | For AI name recommendations |
| `VITE_APP_NAME`          | ❌       | App display name            |
| `VITE_APP_VERSION`       | ❌       | App version                 |

### Vercel Configuration

The `vercel.json` file is already configured with:

- ✅ Vite framework detection
- ✅ Proper build commands
- ✅ SPA routing
- ✅ Cache headers for static assets

## 🐛 Troubleshooting

### Common Issues

**1. "Missing Supabase environment variables" error**

- ✅ Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- ✅ Make sure the keys start with `VITE_` (required for Vite)

**2. "No data found" or empty search results**

- ✅ Verify the migration script completed successfully
- ✅ Check Supabase → Table Editor → `french_names` has data
- ✅ Run: `SELECT COUNT(*) FROM french_names;` in SQL Editor

**3. Department map not showing data**

- ✅ Check that `departments` table has data
- ✅ Verify the `get_department_data` function exists
- ✅ Test the function: `SELECT * FROM get_department_data('Marie', 'F', 2023);`

**4. Build fails on Vercel**

- ✅ Check that all dependencies are in `package.json`
- ✅ Make sure TypeScript types are correct
- ✅ Verify no console errors in local build: `npm run build`

### Database Performance

For optimal performance with large datasets:

```sql
-- Add additional indexes if needed
CREATE INDEX IF NOT EXISTS idx_french_names_popular
ON french_names(geo_object, time_period, obs_value DESC)
WHERE geo_object = 'FRANCE';

-- Monitor query performance
EXPLAIN ANALYZE SELECT * FROM get_name_details('Marie', 'F');
```

## 📊 Monitoring & Analytics

1. **Supabase Dashboard**: Monitor database usage, query performance
2. **Vercel Analytics**: Track page views, performance metrics
3. **Error Tracking**: Check Vercel function logs for errors

## 🔄 Updating Data

To update with new INSEE data:

1. **Download new CSV** from INSEE
2. **Replace** `data/DS_PRENOM_2024_DATA.CSV`
3. **Run migration script** (it will update existing records)
4. **Regenerate statistics**:
   ```sql
   DELETE FROM name_statistics;
   -- Then re-run the statistics generation part of the migration
   ```

## 🚀 Next Steps

After successful deployment:

- ✅ Set up custom domain in Vercel
- ✅ Configure analytics (Google Analytics, Plausible)
- ✅ Add monitoring (Sentry for error tracking)
- ✅ Optimize images and assets
- ✅ Set up automated backups in Supabase

## 📞 Support

If you encounter issues:

1. Check the **console logs** in browser developer tools
2. Review **Vercel deployment logs**
3. Check **Supabase logs** in dashboard
4. Verify **environment variables** are set correctly

---

🎉 **Congratulations!** Your French baby names app should now be live on Vercel with Supabase backend!
