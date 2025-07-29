# Supabase Setup Guide

This guide will help you set up Supabase for authentication and user management in your Baby Names application.

## 🚀 Quick Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `baby-names-app` (or your preferred name)
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"

### 2. Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (starts with `eyJ`)

### 3. Configure Environment Variables

1. Create a `.env` file in your project root (if it doesn't exist)
2. Add your Supabase credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# App Configuration
VITE_APP_NAME=Baby Names Explorer
VITE_APP_VERSION=1.0.0
```

### 4. Apply Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire content from `database/schema.sql`
3. Paste it into the SQL editor and click "Run"

### 5. Configure Authentication

1. Go to **Authentication** → **Settings**
2. Configure your site URL:
   - **Site URL**: `http://localhost:5173` (for development)
   - **Redirect URLs**: Add `http://localhost:5173/**`
3. Save changes

### 6. Test the Setup

1. Restart your development server: `npm run dev`
2. Try to create an account or sign in
3. Check the browser console for any errors

## 🔧 Troubleshooting

### Common Issues

#### "Database error saving new user"

- **Cause**: Database schema not applied
- **Solution**: Run the SQL from `database/schema.sql` in Supabase SQL Editor

#### "Authentication not configured"

- **Cause**: Missing environment variables
- **Solution**: Check your `.env` file and restart the dev server

#### "Invalid API key"

- **Cause**: Wrong anon key
- **Solution**: Copy the correct anon key from Supabase dashboard

### Environment Variables Check

Make sure your `.env` file has:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Database Schema Verification

After running the schema, you should have these tables:

- `profiles`
- `collections`
- `collection_members`
- `collection_invitations`
- `favorites`
- `dislikes`

## 📱 Production Deployment

For production, update your environment variables:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

And update Supabase Authentication settings:

- **Site URL**: Your production domain
- **Redirect URLs**: Your production domain with `/**`

## 🔒 Security Notes

- Never commit your `.env` file to version control
- The anon key is safe to use in client-side code
- Row Level Security (RLS) is enabled by default
- Users can only access their own data

## 📞 Support

If you're still having issues:

1. Check the browser console for detailed error messages
2. Verify your Supabase project is active
3. Ensure all environment variables are set correctly
4. Restart your development server after making changes
