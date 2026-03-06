# BharatShort AI - Complete Setup & Deployment Guide

## 🎯 Project Overview

BharatShort AI is an AI-powered platform that automatically generates short-form videos for YouTube Shorts, Instagram Reels, and TikTok. Users provide a topic, and the system generates:
- AI-written scripts
- AI-generated images
- AI-created video clips
- AI voice narration
- Auto-generated captions
- Final compiled video

## 🏗️ Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TailwindCSS
- TypeScript

**Backend:**
- Next.js API Routes
- Supabase (PostgreSQL + Auth)
- Upstash Redis (Queue System)

**Storage:**
- Cloudflare R2

**AI Services:**
- OpenAI GPT-4o mini (Script Generation)
- Nebius AI (Image Generation - Flux Schnell, SDXL)
- Haiper AI (Video Generation)
- Bhashini AI (Hindi Text-to-Speech)
- Google Cloud TTS (Multi-language TTS)
- OpenAI Whisper (Speech-to-Text for Captions)

**Deployment:**
- Vercel

## 📋 Prerequisites

Before you begin, create accounts and get API keys for:

1. ✅ Supabase (Database & Auth) - https://supabase.com
2. ✅ OpenAI - https://platform.openai.com
3. ✅ Nebius AI - https://studio.nebius.ai
4. ✅ Haiper AI - https://haiper.ai
5. ✅ Bhashini AI (for Hindi) - https://bhashini.gov.in
6. ✅ Google Cloud (for TTS) - https://cloud.google.com
7. ✅ Cloudflare (for R2 Storage) - https://cloudflare.com
8. ✅ Upstash (for Redis) - https://upstash.com
9. ✅ Vercel (for Deployment) - https://vercel.com

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd Bharatshort
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in all the values:

```bash
cp .env.example .env
```

Required environment variables:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Nebius AI
NEBIUS_API_KEY=
NEBIUS_API_URL=https://api.studio.nebius.ai/v1/

# Haiper AI
HAIPER_API_KEY=
HAIPER_API_URL=https://api.haiper.ai/v1/

# Bhashini AI (Hindi TTS)
BHASHINI_API_KEY=
BHASHINI_USER_ID=

# Google Cloud TTS
GOOGLE_CLOUD_TTS_API_KEY=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=bharatshort-videos
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEFAULT_USER_CREDITS=100
```

### 3. Database Setup

Follow the Supabase setup guide:

```bash
# See supabase/SETUP.md for detailed instructions
```

1. Create Supabase project
2. Run the SQL migration in `supabase/migrations/001_initial_schema.sql`
3. Verify tables and triggers are created

### 4. Storage Setup

Follow the Cloudflare R2 setup guide:

```bash
# See docs/STORAGE_SETUP.md for detailed instructions
```

1. Create R2 bucket
2. Generate API tokens
3. Configure public access
4. Update environment variables

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## 📁 Project Structure

```
bharatshort/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Landing page
│   │   ├── layout.tsx         # Root layout
│   │   ├── providers.tsx      # Context providers
│   │   ├── login/             # Login page
│   │   ├── signup/            # Signup page
│   │   ├── dashboard/         # Dashboard page
│   │   ├── create/            # Create video page
│   │   ├── projects/          # Project detail pages
│   │   ├── auth/              # Auth callback
│   │   └── api/               # API routes
│   │       ├── generate/      # Video generation endpoint
│   │       ├── jobs/          # Job status endpoints
│   │       └── user/          # User data endpoint
│   ├── lib/                   # Core library code
│   │   ├── api/               # API integrations
│   │   │   ├── openai.ts     # OpenAI GPT
│   │   │   ├── nebius.ts     # Nebius AI images
│   │   │   ├── haiper.ts     # Haiper AI videos
│   │   │   └── tts.ts        # Text-to-Speech
│   │   ├── supabase.ts       # Supabase client
│   │   ├── storage.ts        # R2 storage utilities
│   │   ├── credits.ts        # Credit management
│   │   ├── queue.ts          # Redis queue
│   │   ├── video-processor.ts # FFmpeg processing
│   │   └── video-generator.ts # Main pipeline
│   └── middleware.ts          # Route protection
├── supabase/
│   ├── migrations/            # Database migrations
│   └── SETUP.md              # Supabase setup guide
├── docs/
│   └── STORAGE_SETUP.md      # Storage setup guide
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── vercel.json               # Vercel deployment config
```

## 🎬 How It Works

### Video Generation Pipeline

1. **User submits topic** → API validates credits
2. **Script generation** → OpenAI GPT-4o mini creates scenes
3. **Image generation** → Nebius AI generates visuals for each scene
4. **Video generation** → Haiper AI converts images to video clips
5. **Voice generation** → Bhashini/Google TTS creates narration
6. **Video compilation** → FFmpeg combines everything
7. **Caption generation** → Whisper transcribes and adds subtitles
8. **Final upload** → Video uploaded to R2 storage

### Credit System

- Script generation: 5 credits
- Image generation: 3 credits per image
- Video generation: 2 credits per second
- Voice narration: 0.5 credits per second
- Users start with 100 free credits

## 🚀 Deployment to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to https://vercel.com
2. Click "Import Project"
3. Select your GitHub repository
4. Configure:
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 3. Add Environment Variables

In Vercel project settings, add ALL environment variables from your `.env` file.

### 4. Deploy

Click "Deploy" and wait for the build to complete.

### 5. Post-Deployment

1. Update `NEXT_PUBLIC_APP_URL` with your Vercel URL
2. Update Supabase Auth redirect URLs
3. Test the application

## 🧪 Testing

### Test User Registration

```bash
1. Go to /signup
2. Create account with email
3. Verify email
4. Check database for user record with 100 credits
```

### Test Video Generation

```bash
1. Login to dashboard
2. Click "Create New Video"
3. Enter topic: "Benefits of morning exercise"
4. Select language and duration
5. Click "Generate Video"
6. Monitor progress on project page
```

## 🔧 Troubleshooting

### Database Issues
- Verify Supabase connection
- Check RLS policies are enabled
- Ensure triggers are running

### API Key Errors
- Verify all API keys are correct
- Check API quotas and limits
- Test each API individually

### Video Generation Fails
- Check logs in Vercel Functions
- Verify FFmpeg is available
- Check storage upload permissions

### Storage Issues
- Verify R2 credentials
- Check bucket permissions
- Test file upload manually

## 📊 Monitoring

- **Vercel Analytics**: Built-in performance monitoring
- **Supabase Dashboard**: Database metrics and logs
- **Upstash Console**: Redis queue monitoring
- **API Provider Dashboards**: Usage and billing

## 💰 Cost Estimation

**Per 60-second video:**
- OpenAI: ~$0.01
- Nebius AI: ~$0.05
- Haiper AI: ~$0.10
- Google TTS: ~$0.01
- R2 Storage: ~$0.001

**Total: ~$0.17 per video**

Add your desired margin to set credit prices.

## 🔐 Security Best Practices

1. Never commit `.env` file
2. Use service role key only on server
3. Enable RLS on all tables
4. Validate all user inputs
5. Rate limit API endpoints
6. Monitor for suspicious activity

## 📝 License

This project is for educational purposes. Ensure you comply with all AI service provider terms of service.

## 🤝 Support

For issues or questions:
1. Check documentation
2. Review error logs
3. Test API endpoints individually
4. Verify environment variables

## 🎯 Next Steps

1. ✅ Set up all API accounts
2. ✅ Configure environment variables
3. ✅ Run database migrations
4. ✅ Test locally
5. ✅ Deploy to Vercel
6. ✅ Test production deployment
7. 🚀 Launch!

---

**Built with ❤️ for content creators**
