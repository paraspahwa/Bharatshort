# Cloudflare R2 Storage Setup Guide

## Prerequisites
- A Cloudflare account with R2 access

## Setup Steps

### 1. Create R2 Bucket
1. Go to your Cloudflare dashboard
2. Navigate to R2 Object Storage
3. Click "Create bucket"
4. Name: `bharatshort-videos`
5. Location: Auto (or choose closest to your users)
6. Click "Create bucket"

### 2. Generate API Keys
1. Go to R2 → Manage R2 API Tokens
2. Click "Create API token"
3. Token name: `bharatshort-api`
4. Permissions: Object Read & Write
5. Select the bucket you created
6. Click "Create API token"
7. Copy the credentials:
   - Access Key ID
   - Secret Access Key
   - Account ID (from the R2 overview page)

### 3. Configure Public Access
1. In your bucket settings, go to "Settings"
2. Under "Public access", click "Allow Access"
3. Create a custom domain or use the R2.dev subdomain
4. Note the public URL (e.g., `https://pub-xxxxx.r2.dev`)

### 4. Update Environment Variables
Add these to your `.env` file:

```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=bharatshort-videos
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

### 5. Update next.config.js
Replace the domain in `next.config.js`:

```javascript
images: {
  domains: ['pub-xxxxx.r2.dev'], // Replace with your R2 public URL
}
```

## File Structure
Files are organized in R2 as:
- `/images/` - Generated scene images
- `/videos/` - Generated video clips and final videos
- `/audio/` - Generated voice narration files
- `/uploads/` - Other uploaded content

## Alternatives

### Using Supabase Storage Instead
If you prefer Supabase Storage over Cloudflare R2:

1. Create a storage bucket in Supabase:
   - Go to Storage in Supabase dashboard
   - Create bucket `videos` (public)
   - Create bucket `images` (public)

2. Update `src/lib/storage.ts` to use Supabase client:
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   
   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!
   )
   
   // Use supabase.storage.from('videos').upload() etc.
   ```

## Best Practices

1. **CORS Configuration**: If accessing from browser, configure CORS in R2 settings
2. **Lifecycle Policies**: Set up automatic deletion of old files to save costs
3. **CDN**: Use Cloudflare CDN for better performance
4. **Error Handling**: Always handle upload/download errors gracefully
5. **Naming**: Use UUIDs to avoid filename collisions

## Cost Considerations
- Storage: $0.015 per GB/month
- Class A operations (writes): $4.50 per million
- Class B operations (reads): $0.36 per million
- Egress: FREE (unlike AWS S3)

## Testing
Test your storage configuration:
```bash
npm run dev
```

Try uploading a test file through the API to verify credentials are working.
