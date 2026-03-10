# API Documentation

## Base URL
`https://your-domain.vercel.app/api`

## Authentication
All protected endpoints require authentication via one of:

- Supabase session cookie (web)
- Authorization header with Bearer JWT (mobile)

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

### GET /api/payments/plans

Fetches credit plans localized by Geo-IP currency.

**Response:**
```json
{
  "geo": {
    "ip": "1.2.3.4",
    "countryCode": "IN",
    "currency": "INR",
    "source": "vercel-header"
  },
  "currency": "INR",
  "plans": [
    {
      "id": "starter_100",
      "title": "Starter",
      "credits": 100,
      "amountSubunits": 19900,
      "currency": "INR"
    }
  ]
}
```

---

### POST /api/payments/order

Creates a Razorpay order for a selected credit plan.

**Request Body:**
```json
{
  "planId": "starter_100"
}
```

---

### POST /api/payments/verify

Verifies Razorpay client payment signature and credits the user account.
Payment status transition and credit grant are applied atomically in DB.

**Request Body:**
```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature"
}
```

---

### POST /api/payments/webhook

Razorpay webhook handler for server-to-server payment events.
Webhook capture is idempotent and uses the same atomic DB capture path as verify.

**Headers:**
- `x-razorpay-signature` (required)

---

### Payment Reliability Notes

- Apply migration [supabase/migrations/010_payment_capture_atomic.sql](supabase/migrations/010_payment_capture_atomic.sql)
  to enable atomic credit grant on payment capture.
- Duplicate verify/webhook events will not double-credit users.

---

### POST /api/internal/payments/reconcile

Internal reconciliation endpoint for paid Razorpay orders and granted credits.

**Authorization:**
- `x-worker-secret` header matching `WORKER_SECRET`, or
- `x-vercel-cron: 1` (when invoked by Vercel Cron)

**Request Body:**
```json
{
  "repair": false,
  "limit": 100,
  "actor": "ops_manual"
}
```

**Response:**
```json
{
  "repair": false,
  "limit": 100,
  "scanned": 2,
  "repaired": 0,
  "mismatches": [
    {
      "payment_order_id": "uuid",
      "user_id": "uuid",
      "credits": 300,
      "issue": "missing_credit_transaction",
      "repaired": false
    }
  ]
}
```

Apply migration [supabase/migrations/011_payment_reconciliation.sql](supabase/migrations/011_payment_reconciliation.sql)
to enable reconciliation and linked payment-order credit transactions.

---

### GET /api/internal/payments/reconcile/run

Scheduled daily dry-run reconciliation endpoint. Intended to be triggered by cron.

**Authorization:**
- `x-worker-secret` header matching `WORKER_SECRET`, or
- `x-vercel-cron: 1` (when invoked by Vercel Cron)

**Environment controls:**
- `PAYMENT_RECONCILE_CRON_ENABLED` (default: true)
- `PAYMENT_RECONCILE_LIMIT` (default: 200)
- `PAYMENT_RECON_ALERT_WEBHOOK_URL` (optional, sends mismatch alerts)

**Response:**
```json
{
  "success": true,
  "repair": false,
  "limit": 200,
  "scanned": 0,
  "mismatches": []
}
```

---

### GET /api/internal/payments/dashboard-reconcile

Admin-only dashboard endpoint to fetch recent reconciliation runs.

**Authentication:**
- Supabase session cookie
- User must have an active row in `public.admin_users`

**Response:**
```json
{
  "runs": [
    {
      "id": "uuid",
      "actor": "dashboard:admin@example.com",
      "repair_mode": false,
      "scanned_count": 3,
      "repaired_count": 0,
      "created_at": "2026-03-10T20:31:10.123Z"
    }
  ]
}
```

### POST /api/internal/payments/dashboard-reconcile

Admin-only dashboard endpoint to run reconciliation from UI.

**Request Body:**
```json
{
  "repair": false,
  "limit": 100
}
```

**Response:**
```json
{
  "repair": false,
  "limit": 100,
  "scanned": 2,
  "repaired": 0,
  "mismatches": [
    {
      "payment_order_id": "uuid",
      "user_id": "uuid",
      "credits": 300,
      "issue": "missing_credit_transaction",
      "repaired": false
    }
  ]
}
```

### GET /api/internal/costs/rollup/run

Internal endpoint to refresh daily generation cost rollups.

**Authorization:**
- `x-worker-secret` header matching `WORKER_SECRET`, or
- `x-vercel-cron: 1` (when invoked by Vercel Cron)

**Environment controls:**
- `COST_ROLLUP_CRON_ENABLED` (default: true)
- `COST_ROLLUP_DAYS` (default: 30, max 365)
- `COST_ROLLUP_INR_TO_USD` (default: 83)

**Response:**
```json
{
  "success": true,
  "days": 30,
  "inrToUsd": 83,
  "latest": {
    "day": "2026-03-10",
    "total_cost_usd": "12.345600",
    "total_revenue_usd": "24.567800",
    "total_credits_sold": 1200,
    "margin_percent": "49.7531"
  },
  "rows": []
}
```

Apply migration [supabase/migrations/015_generation_cost_rollups.sql](supabase/migrations/015_generation_cost_rollups.sql)
to enable daily pricing and COGS rollups.

---

### GET /api/internal/costs/dashboard-summary

Admin-only dashboard endpoint to read cost/revenue rollup summaries.

**Authentication:**
- Supabase session cookie
- User must have an active row in `public.admin_users`

**Query Parameters:**
- `limit` (optional): Days to return (1-120, default 30)

**Response:**
```json
{
  "days": 30,
  "summary": {
    "totalCostUsd": 120.123456,
    "totalRevenueUsd": 310.987654,
    "grossMarginUsd": 190.864198,
    "marginPercent": 61.3732,
    "totalCreditsSold": 12000,
    "totalRefundedCredits": 320,
    "costPerCreditUsd": 0.01001,
    "revenuePerCreditUsd": 0.025915,
    "totalJobs": 540,
    "completedJobs": 498,
    "failedJobs": 42,
    "paidOrders": 87
  },
  "rows": []
}
```

### Admin Access Model

- Apply migration [supabase/migrations/012_admin_users.sql](supabase/migrations/012_admin_users.sql)
  to enable DB-backed dashboard admin roles.
- Apply migration [supabase/migrations/013_admin_audit_logs.sql](supabase/migrations/013_admin_audit_logs.sql)
  to enable immutable admin grant/revoke audit tracking.
- Bootstrap an admin by inserting their user id into `public.admin_users`:

```sql
insert into public.admin_users (user_id, is_active, notes)
values ('<auth-user-uuid>', true, 'initial ops admin')
on conflict (user_id) do update set is_active = excluded.is_active;
```

Admin grant/revoke actions now write audit entries to `public.admin_audit_logs` with:
- action (`grant` or `revoke`)
- actor identity (user id/email for dashboard admins, optional actor email for internal ops)
- target identity
- source endpoint metadata

---

### GET /api/payments/history

Returns authenticated user's Razorpay order history.

**Query Parameters:**
- `limit` (optional): Number of records to return (1-100, default 20)

**Response:**
```json
{
  "payments": [
    {
      "id": "uuid",
      "plan_id": "starter_100",
      "credits": 100,
      "currency": "INR",
      "amount_subunits": 19900,
      "status": "paid",
      "razorpay_order_id": "order_xxx",
      "razorpay_payment_id": "pay_xxx",
      "created_at": "2026-03-10T20:31:10.123Z"
    }
  ]
}
```

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
- User must have an active row in `public.admin_users`

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

### GET /api/internal/admin/users

Internal admin management endpoint to list dashboard admins.

**Authorization:**
- `x-worker-secret` header matching `WORKER_SECRET` (strictly required)

**Query Parameters:**
- `activeOnly` (optional): `true` to list only active admins

**Response:**
```json
{
  "admins": [
    {
      "user_id": "uuid",
      "email": "admin@example.com",
      "is_active": true,
      "notes": "initial ops admin",
      "created_at": "2026-03-10T20:31:10.123Z",
      "updated_at": "2026-03-10T20:31:10.123Z"
    }
  ],
  "total": 1
}
```

### POST /api/internal/admin/users

Grants or re-activates dashboard admin access.

**Authorization:**
- `x-worker-secret` header matching `WORKER_SECRET` (strictly required)

**Request Body:**
```json
{
  "email": "admin@example.com",
  "notes": "ops on-call"
}
```

You may pass `userId` instead of `email`.

### DELETE /api/internal/admin/users

Revokes dashboard admin access by setting `is_active=false`.

**Authorization:**
- `x-worker-secret` header matching `WORKER_SECRET` (strictly required)

**Request Body:**
```json
{
  "email": "admin@example.com"
}
```

You may pass `userId` instead of `email`.

---

### GET /api/internal/admin/dashboard-users

Dashboard-safe proxy endpoint for admin management UI.

**Authentication:**
- Supabase session cookie
- Request user must be active admin in `public.admin_users`

**Response:**
```json
{
  "admins": [
    {
      "user_id": "uuid",
      "email": "admin@example.com",
      "is_active": true,
      "notes": "ops on-call",
      "created_at": "2026-03-10T20:31:10.123Z",
      "updated_at": "2026-03-10T20:31:10.123Z"
    }
  ],
  "total": 1
}
```

### POST /api/internal/admin/dashboard-users

Grants or re-activates dashboard admin access from the dashboard UI.

**Authentication:**
- Supabase session cookie
- Request user must be active admin in `public.admin_users`

**Request Body:**
```json
{
  "email": "admin@example.com",
  "notes": "ops on-call"
}
```

You may pass `userId` instead of `email`.

### DELETE /api/internal/admin/dashboard-users

Revokes dashboard admin access (`is_active=false`) from the dashboard UI.

**Authentication:**
- Supabase session cookie
- Request user must be active admin in `public.admin_users`

**Request Body:**
```json
{
  "userId": "uuid"
}
```

Safety rule: endpoint prevents revoking the last active admin account.

---

### GET /api/internal/admin/dashboard-audit

Dashboard-safe read-only endpoint for recent admin grant/revoke audit events.

**Authentication:**
- Supabase session cookie
- Request user must be active admin in `public.admin_users`

**Query Parameters:**
- `limit` (optional): 1-100, default 25
- `page` (optional): 1-based page number, default 1
- `action` (optional): `grant` or `revoke`
- `query` (optional): case-insensitive text search across actor and target email

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "action": "grant",
      "actor_type": "dashboard_admin",
      "actor_user_id": "uuid",
      "actor_email": "admin@example.com",
      "target_user_id": "uuid",
      "target_email": "target@example.com",
      "notes": "ops on-call",
      "source": "dashboard_proxy",
      "metadata": {
        "endpoint": "/api/internal/admin/dashboard-users"
      },
      "created_at": "2026-03-10T20:31:10.123Z"
    }
  ],
  "limit": 25,
  "page": 1,
  "action": null,
  "query": null,
  "hasMore": false
}
```

---

### GET /api/internal/jobs/health

Internal configuration health endpoint that validates required environment
variables by subsystem and returns pass/warn/fail status.

**Authorization:**
- `x-worker-secret` header matching `WORKER_SECRET`, or
- `x-vercel-cron: 1` (when invoked by Vercel Cron)

**Response:**
```json
{
  "generatedAt": "2026-03-10T20:31:10.123Z",
  "overallStatus": "warn",
  "executionMode": "queue",
  "checks": [
    {
      "name": "supabase",
      "status": "ok",
      "missing": []
    },
    {
      "name": "worker_tuning",
      "status": "warn",
      "missing": [],
      "notes": ["WORKER_MAX_ATTEMPTS is not set; DB default max attempts will be used"]
    }
  ]
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

When `REFUND_ON_TERMINAL_FAILURE=true`, the system automatically refunds
idempotent generation charges for jobs that reach terminal failure.

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
