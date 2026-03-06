# Supabase Setup Guide

## Prerequisites
- A Supabase account (https://supabase.com)

## Setup Steps

### 1. Create a New Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details:
   - Name: bharatshort-ai
   - Database Password: (generate a strong password)
   - Region: Choose closest to your users
4. Click "Create new project"

### 2. Get Your API Keys
1. Go to Project Settings → API
2. Copy the following values to your `.env` file:
   - `NEXT_PUBLIC_SUPABASE_URL`: Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key (keep this secret!)

### 3. Run Database Migrations
1. Go to SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Paste it into the SQL editor
4. Click "Run" to execute the migration

This will create:
- Users table
- Projects table
- Scenes table
- Credit transactions table
- Generation jobs table
- All necessary indexes and triggers
- Row Level Security policies

### 4. Configure Authentication
1. Go to Authentication → Providers
2. Enable Email provider
3. (Optional) Enable OAuth providers:
   - Google
   - GitHub
   - Discord

### 5. Configure Storage (Optional)
If you want to use Supabase Storage instead of Cloudflare R2:
1. Go to Storage
2. Create a new bucket called "videos"
3. Set it to public
4. Create policies for authenticated users

### 6. Test Connection
Run your Next.js app:
```bash
npm install
npm run dev
```

Try signing up a new user to verify the database trigger creates a user record with default credits.

## Database Schema Overview

### Users Table
- Extends Supabase auth.users
- Tracks credits and total videos created
- Auto-created via trigger when user signs up

### Projects Table
- Stores video project information
- Links to user via user_id
- Tracks status, script, video URLs, and credits used

### Scenes Table
- Individual scenes within a project
- Stores text, image prompts, and generated media URLs
- Ordered by sequence_order

### Credit Transactions Table
- Audit log of all credit usage
- Tracks purchases, usage, bonuses, and refunds

### Generation Jobs Table
- Tracks async video generation progress
- Updates in real-time as video is being created
- Stores error messages if generation fails

## Row Level Security (RLS)
All tables have RLS enabled. Users can only:
- View their own data
- Create/update/delete their own projects
- View scenes and jobs for their own projects

## Functions
- `handle_new_user()`: Automatically creates user record on signup
- `deduct_credits()`: Safely deducts credits with transaction recording
- `update_updated_at_column()`: Auto-updates timestamps

## Next Steps
1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials
3. Run the migration SQL
4. Test user signup and login
