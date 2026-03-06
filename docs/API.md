# API Documentation

## Base URL
`https://your-domain.vercel.app/api`

## Authentication
All endpoints require authentication via Supabase session cookie.

## Endpoints

### POST /api/generate

Create a new video generation job.

**Request Body:**
```json
{
  "topic": "Top 5 benefits of morning exercise",
  "language": "en",
  "duration": 60
}
```

**Parameters:**
- `topic` (string, required): The video topic/subject
- `language` (string, optional): Language code (en, hi, es, fr, de, ja, ko). Default: "en"
- `duration` (number, optional): Video duration in seconds (30-90). Default: 60

**Response:**
```json
{
  "success": true,
  "projectId": "uuid",
  "jobId": "timestamp_uuid",
  "message": "Video generation started"
}
```

**Error Response:**
```json
{
  "error": "Insufficient credits"
}
```

---

### GET /api/jobs/[jobId]

Get the status of a video generation job.

**Parameters:**
- `jobId` (string, required): Job ID from /api/generate

**Response:**
```json
{
  "id": "job_id",
  "projectId": "uuid",
  "userId": "uuid",
  "status": "processing",
  "progress": 45,
  "currentStep": "Generating images",
  "createdAt": 1234567890
}
```

**Status Values:**
- `queued`: Job is waiting to start
- `processing`: Job is being processed
- `completed`: Job finished successfully
- `failed`: Job failed with error

---

### GET /api/user

Get current user data and statistics.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "credits": 85,
    "total_videos_created": 5
  },
  "creditSummary": {
    "currentBalance": 85,
    "totalSpent": 115,
    "totalAdded": 200,
    "videoCount": 5
  },
  "recentProjects": [...]
}
```

---

## Error Codes

- `401`: Unauthorized - Invalid or missing session
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource not found
- `400`: Bad Request - Invalid parameters
- `500`: Internal Server Error - Server error

## Rate Limiting

- 10 requests per minute per user
- 50 video generations per day per user

## Credit Costs

| Operation | Credits |
|-----------|---------|
| Script Generation | 5 |
| Image Generation (per image) | 3 |
| Video Generation (per second) | 2 |
| Voice Generation (per second) | 0.5 |

## Example Usage

### JavaScript/Fetch
```javascript
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    topic: 'How to make perfect chai tea',
    language: 'en',
    duration: 60
  })
})

const data = await response.json()
console.log(data.projectId)
```

### cURL
```bash
curl -X POST https://your-domain.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Benefits of meditation",
    "language": "en",
    "duration": 60
  }'
```

## Webhooks (Coming Soon)

Receive notifications when video generation completes.
