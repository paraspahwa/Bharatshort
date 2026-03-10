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
- `idempotencyKey` (string, optional): Client-provided key to make request retries safe

**Headers:**
- `Idempotency-Key` (string, optional): Preferred idempotency key header

**Response:**
```json
{
  "success": true,
  "projectId": "uuid",
  "jobId": "timestamp_uuid",
  "message": "Video generation started"
}

If the same authenticated user repeats a request with the same idempotency key,
the API returns the existing `projectId` and `jobId` instead of creating a duplicate job.
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

### POST /api/internal/jobs/process

Internal endpoint for workers to process one queued generation job.

**Headers:**
- `x-worker-secret` (required): Must match `WORKER_SECRET`

**Response:**
```json
{
  "claimed": true,
  "jobId": "uuid",
  "projectId": "uuid",
  "success": true
}
```

If no jobs are available:
```json
{
  "claimed": false,
  "reason": "no_jobs_available"
}
```

---

### POST /api/internal/jobs/run

Internal scheduler loop endpoint. Processes multiple jobs in one invocation
until no jobs remain, max job count is reached, or max duration is reached.

**Authorization:**
- `x-worker-secret` header matching `WORKER_SECRET`, or
- `x-vercel-cron: 1` (when invoked by Vercel Cron)

**Environment controls:**
- `WORKER_MAX_JOBS_PER_TICK` (default: 5)
- `WORKER_MAX_DURATION_MS` (default: 45000)
- `WORKER_MAX_ATTEMPTS` (default from DB: 3)

**Response:**
```json
{
  "processed": 2,
  "maxJobsPerTick": 5,
  "maxDurationMs": 45000,
  "results": [
    { "jobId": "uuid", "projectId": "uuid", "success": true }
  ]
}
```

---

### GET /api/internal/jobs/metrics

Internal observability endpoint for worker operations.

**Authorization:**
- `x-worker-secret` header matching `WORKER_SECRET`, or
- `x-vercel-cron: 1` (when invoked by Vercel Cron)

**Response:**
```json
{
  "generatedAt": "2026-03-10T20:31:10.123Z",
  "jobs": {
    "queuedTotal": 12,
    "queuedReady": 4,
    "retryScheduled": 8,
    "processing": 2,
    "stuckProcessing": 1,
    "completed": 210,
    "failed": 9,
    "deadLetter": 3
  },
  "recentDeadLetters": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "attempt_count": 3,
      "max_attempts": 3,
      "error_code": "WORKER_RETRY_EXHAUSTED"
    }
  ]
}
```

---

### GET /api/internal/jobs/dashboard-metrics

Server-side proxy endpoint intended for in-app dashboard visibility.

**Access rules:**
- `WORKER_SECRET` must be configured
- User must be authenticated
- User email must be included in `ADMIN_EMAILS` (comma-separated)

**Response:**
```json
{
  "generatedAt": "2026-03-10T20:31:10.123Z",
  "queuedReady": 4,
  "retryScheduled": 8,
  "processing": 2,
  "stuckProcessing": 1,
  "deadLetter": 3
}
```

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

Billing is retry-safe for generation jobs. Each charge step is guarded by a
job-scoped idempotency ledger key, so retries do not double-charge the same step.

Worker retries use exponential backoff for transient errors. Once max attempts
are exhausted, jobs are marked failed with a dead-letter style error code
(`WORKER_RETRY_EXHAUSTED`) for operational triage.

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
