# Environment Variables Reference

## Required Variables

### Supabase (Database & Authentication)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to get:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy Project URL and keys

---

### OpenAI (Script Generation & Whisper)
```env
OPENAI_API_KEY=sk-proj-xxxxx
```

**Where to get:**
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy and save (shown only once)

**Cost:** ~$0.01 per video

---

### Nebius AI (Image Generation)
```env
NEBIUS_API_KEY=your_nebius_api_key
NEBIUS_API_URL=https://api.studio.nebius.ai/v1/
```

**Where to get:**
1. Go to https://studio.nebius.ai
2. Sign up and verify email
3. Go to API Keys section
4. Generate new API key

**Cost:** ~$0.05 per video (5 images)

---

### Haiper AI (Video Generation)
```env
HAIPER_API_KEY=your_haiper_api_key
HAIPER_API_URL=https://api.haiper.ai/v1/
```

**Where to get:**
1. Go to https://haiper.ai
2. Sign up for API access
3. Generate API key from dashboard

**Cost:** ~$0.10 per video (5 clips × 5 seconds)

---

### Bhashini AI (Hindi Text-to-Speech)
```env
BHASHINI_API_KEY=your_bhashini_api_key
BHASHINI_USER_ID=your_bhashini_user_id
```

**Where to get:**
1. Go to https://bhashini.gov.in/ulca
2. Register and login
3. Go to Profile → API Keys
4. Generate new API key and note User ID

**Cost:** FREE (Government initiative)

---

### Google Cloud Text-to-Speech
```env
GOOGLE_CLOUD_TTS_API_KEY=AIzaSyxxxxxx
```

**Where to get:**
1. Go to https://console.cloud.google.com
2. Create new project
3. Enable Cloud Text-to-Speech API
4. Create credentials → API Key
5. Restrict key to Text-to-Speech API only

**Cost:** ~$0.01 per video

---

### Cloudflare R2 (Storage)
```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=bharatshort-videos
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

**Where to get:**
1. Go to https://dash.cloudflare.com
2. Navigate to R2 Object Storage
3. Create bucket "bharatshort-videos"
4. Go to Manage R2 API Tokens
5. Create token with Read & Write permissions
6. Copy credentials

**Cost:** ~$0.001 per video

---

### Upstash Redis (Queue System)
```env
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxxxxxxxx
```

**Where to get:**
1. Go to https://console.upstash.com
2. Create new Redis database
3. Select region closest to you
4. Copy REST URL and Token from Details

**Cost:** FREE tier sufficient (up to 10,000 commands/day)

---

### Application Configuration
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEFAULT_USER_CREDITS=100
```

**Development:**
- Use `http://localhost:3000`

**Production:**
- Update to your Vercel domain: `https://your-app.vercel.app`

---

## Security Best Practices

1. **Never commit `.env` file to Git**
   - Already in `.gitignore`
   - Use `.env.example` as template

2. **Use different keys for development and production**
   - Create separate API keys for testing
   - Rotate keys regularly

3. **Restrict API keys**
   - Add domain/IP restrictions where possible
   - Set usage limits

4. **Monitor usage**
   - Set up billing alerts
   - Track API costs regularly

5. **Supabase Service Role Key**
   - NEVER expose in client-side code
   - Only use in API routes and server components

---

## Testing Your Setup

After setting all environment variables:

```bash
# Start development server
npm run dev

# Test Supabase connection
# Try signing up a new user

# Test API integrations
# Create a test video with topic "AI testing"

# Monitor logs for errors
# Check Vercel Functions logs
```

---

## Troubleshooting

### Invalid API Key
- Double-check key is copied correctly (no spaces)
- Ensure key has necessary permissions
- Check if key is expired

### Connection Errors
- Verify URLs are correct
- Check network/firewall settings
- Ensure services are not down

### Rate Limit Errors
- Check API usage limits
- Upgrade plan if needed
- Implement request throttling

---

## Cost Management

**Total estimated cost per 60-second video:**
- OpenAI: $0.01
- Nebius AI: $0.05
- Haiper AI: $0.10
- Google TTS: $0.01
- R2 Storage: $0.001
- **Total: ~$0.17**

**Monthly costs (100 videos):**
- APIs: ~$17
- Storage: ~$1
- Database: FREE (Supabase)
- Hosting: FREE (Vercel)
- **Total: ~$18**

Set your credit prices accordingly to cover costs and profit margin.
