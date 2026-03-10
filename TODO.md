# Bharatshort Next Phase TODO

This file contains the exact steps to complete rollout of the current architecture work (worker reliability, Razorpay payments, and reconciliation).

## Execution Status (Local Validation on 2026-03-10)

Completed locally:

- Migration files 001-011 are present in repo, including 009/010/011.
- TypeScript compile check passes (`npm run type-check`).
- Internal health endpoint responds via cron-auth header.

Current blockers discovered locally:

- `WORKER_SECRET` missing in active runtime env.
- Razorpay env missing in active runtime env:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET`
- `GENERATION_EXECUTION_MODE` is still `inline` (should be `queue` for worker mode rollout).
- Worker tuning envs not set in active runtime (`WORKER_MAX_*`, reconcile knobs).
- Internal metrics/reconcile run endpoints currently return `TypeError: fetch failed` in local runtime (likely upstream/network/env dependency issue).

Immediate next actions:

1. Populate missing env vars in local runtime and restart app.
2. Re-run health endpoint until `overallStatus` is `ok` or only expected warnings remain.
3. Re-test:
    - `/api/internal/jobs/metrics`
    - `/api/internal/payments/reconcile/run`
4. Apply DB migrations in staging and run payment + reconciliation smoke tests.

## 1. Apply Database Migrations (Required First)

Run the pending SQL migrations in order on every environment (staging, then production):

- supabase/migrations/009_payment_orders.sql
- supabase/migrations/010_payment_capture_atomic.sql
- supabase/migrations/011_payment_reconciliation.sql

Also ensure these already-applied reliability migrations exist in your target DB:

- supabase/migrations/008_generation_job_refunds.sql

Verification checks after migration:

- payment_orders table exists.
- payment_order_reconciliation_runs table exists.
- credit_transactions.payment_order_id column exists.
- capture_payment_order RPC exists.
- reconcile_paid_payment_orders RPC exists.
- refund_generation_job_charges RPC exists.

## 2. Configure Environment Variables

Set these in local .env.local and in deployment provider (Vercel/host):

### Core

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_APP_URL

### Generation providers

- OPENAI_API_KEY
- NEBIUS_API_KEY
- HAIPER_API_KEY
- BHASHINI_API_KEY
- BHASHINI_USER_ID
- GOOGLE_CLOUD_TTS_API_KEY

### Storage and queue

- R2_ACCOUNT_ID
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_BUCKET_NAME
- R2_PUBLIC_URL
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

### Worker mode and tuning

- GENERATION_EXECUTION_MODE=queue
- WORKER_SECRET=<strong-random-secret>
- WORKER_MAX_JOBS_PER_TICK=5
- WORKER_MAX_DURATION_MS=45000
- WORKER_MAX_ATTEMPTS=3
- REFUND_ON_TERMINAL_FAILURE=true

### Admin access

- ADMIN_EMAILS=comma-separated-admin-emails

### Razorpay payments

- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- RAZORPAY_WEBHOOK_SECRET

### Geo-IP and reconciliation

- GEOIP_LOOKUP_URL=https://ipapi.co/{ip}/json/
- PAYMENT_RECONCILE_CRON_ENABLED=true
- PAYMENT_RECONCILE_LIMIT=200
- PAYMENT_RECON_ALERT_WEBHOOK_URL=<optional-alert-endpoint>

## 3. Configure Razorpay Dashboard

In Razorpay dashboard:

1. Create/confirm API keys and copy to env.
2. Configure webhook URL:
   - https://<your-domain>/api/payments/webhook
3. Set webhook secret and match RAZORPAY_WEBHOOK_SECRET.
4. Enable at least events:
   - payment.captured
   - order.paid
5. Send a test webhook and verify 200 response.

## 4. Confirm Scheduled Jobs (Cron)

The app expects these internal schedules:

- /api/internal/jobs/run every minute
- /api/internal/payments/reconcile/run daily (02:00 UTC currently)

Verify in deployment platform that both cron jobs are active and invoking successfully.

## 5. Security Hardening Checks

- Ensure WORKER_SECRET is long and unique per environment.
- Ensure internal endpoints are not publicly documented outside trusted ops.
- Keep ADMIN_EMAILS minimal (least privilege).
- Rotate Razorpay and worker secrets if previously shared.

## 6. Post-Deploy Validation (Staging then Production)

### Worker and generation flow

1. Create a test project.
2. Confirm job transitions: queued -> processing -> completed.
3. Confirm output assets are stored in R2.
4. Confirm credit deduction is correct and idempotent on retries.

### Payment flow

1. Open dashboard and load plans.
2. Complete a Razorpay payment.
3. Confirm:
   - payment_orders row becomes paid
   - credit_transactions has purchase row with payment_order_id
   - user credits increased once
4. Replay verify/webhook call and confirm no double credit.

### Reconciliation flow

1. Open dashboard Payment Reconciliation panel (admin user).
2. Run Dry Reconciliation.
3. If mismatches exist, run Repair Reconciliation.
4. Confirm repaired count and new credit transaction linkage.

## 7. Monitoring and Alerting

- Check /api/internal/jobs/health with worker auth header.
- Check /api/internal/jobs/metrics for queue health trends.
- Check /api/internal/payments/reconcile/run logs daily.
- If PAYMENT_RECON_ALERT_WEBHOOK_URL is set, verify alerts arrive when mismatches > 0.

## 8. Rollback Plan

If payment capture behaves unexpectedly:

1. Disable checkout entry in UI temporarily.
2. Keep webhook active for capture consistency.
3. Use Dry Reconciliation to estimate drift.
4. Use Repair Reconciliation only after manual review.
5. Re-enable checkout after validation.

If worker instability occurs:

1. Reduce WORKER_MAX_JOBS_PER_TICK.
2. Keep retry attempts conservative.
3. Investigate dead-letter failures from dashboard metrics.

## 9. Optional Next Improvements

- Add role-based admin table (instead of ADMIN_EMAILS env list).
- Add reconciliation export (CSV) and pagination.
- Add Slack/Discord formatted alert adapters.
- Add automated integration tests for payment verify + webhook idempotency.

## Completion Checklist

- [x] Required migration files are present in repository.
- [x] Local compile check passes (`npm run type-check`).
- [ ] Migrations 009/010/011 applied in staging.
- [ ] Migrations 009/010/011 applied in production.
- [ ] All required env vars configured.
- [ ] Razorpay webhook configured and tested.
- [ ] Worker cron confirmed.
- [ ] Reconciliation cron confirmed.
- [ ] Payment test passed without double-credit.
- [ ] Reconciliation dry-run reviewed.
- [ ] Repair run completed (if needed).
- [ ] Health and metrics checks passing.
