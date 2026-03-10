# Bharatshort Next Phase TODO

This file contains the exact steps to complete rollout of the current architecture work (worker reliability, Razorpay payments, and reconciliation).

## Execution Status (Local Validation on 2026-03-10)

Completed locally:

- Migration files 001-011 are present in repo, including 009/010/011.
- TypeScript compile check passes (`npm run type-check`).
- Internal health endpoint responds via cron-auth header.
- Local env now includes worker/payment/reconcile keys required by health checks.
- Health endpoint now reports `executionMode: queue` with `overallStatus: warn` only for optional alert webhook.

Current blockers discovered locally:

- Internal metrics and reconcile runner endpoints still return `TypeError: fetch failed`.
- Local `.env.local` is using placeholder Supabase/Redis/provider credentials, so data-backed endpoints cannot complete successfully until real staging/prod credentials are used.

Immediate next actions:

1. Replace placeholder secrets in `.env.local` with real staging credentials.
2. Re-run health endpoint until `overallStatus` is `ok` or only expected warnings remain.
3. Re-test data-backed endpoints:
    - `/api/internal/jobs/metrics`
    - `/api/internal/payments/reconcile/run`
4. Apply DB migrations in staging and run payment + reconciliation smoke tests.

## 1. Apply Database Migrations (Required First)

Run the pending SQL migrations in order on every environment (staging, then production):

- supabase/migrations/009_payment_orders.sql
- supabase/migrations/010_payment_capture_atomic.sql
- supabase/migrations/011_payment_reconciliation.sql
- supabase/migrations/012_admin_users.sql
- supabase/migrations/013_admin_audit_logs.sql

Also ensure these already-applied reliability migrations exist in your target DB:

- supabase/migrations/008_generation_job_refunds.sql

Verification checks after migration:

- payment_orders table exists.
- payment_order_reconciliation_runs table exists.
- credit_transactions.payment_order_id column exists.
- capture_payment_order RPC exists.
- reconcile_paid_payment_orders RPC exists.
- refund_generation_job_charges RPC exists.
- admin_users table exists.
- admin_audit_logs table exists.

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

- Add admin users in DB table `public.admin_users`.
- Ensure required dashboard admins have `is_active=true`.
- Manage admin access through internal API `/api/internal/admin/users` with `x-worker-secret`.

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
- Keep `public.admin_users` minimal (least privilege).
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

### Admin management flow

1. Open dashboard as active admin.
2. In "Dashboard Admin Access", grant admin access to a test user.
3. Confirm user appears in admin list as active.
4. Revoke test user and confirm status becomes inactive.
5. Confirm grant/revoke entries appear in dashboard admin audit timeline.
6. Validate action filter (`all/grant/revoke`) and page navigation in audit timeline.
7. Validate email search in audit timeline (actor/target email query).

## 7. Monitoring and Alerting

- Check /api/internal/jobs/health with worker auth header.
- Check /api/internal/jobs/metrics for queue health trends.
- Check /api/internal/payments/reconcile/run logs daily.
- Audit dashboard admin list via `/api/internal/admin/users?activeOnly=true`.
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

- Add reconciliation export (CSV) and pagination.
- Add Slack/Discord formatted alert adapters.
- Add automated integration tests for payment verify + webhook idempotency.

## 10. Landing Redesign Program

Reference plan:

- docs/LANDING_PAGE_REDESIGN_PLAN.md

Execution phases:

1. Phase A: Extract landing into section components.
2. Phase B: Upgrade messaging and conversion architecture.
3. Phase C: Visual and motion polish with mobile-first validation.
4. Phase D: Add analytics events and iterate on CTA performance.

Validation targets:

- Better signup click-through from primary CTA.
- Better scroll reach to trust and FAQ blocks.
- No regression in mobile layout and core web vitals.

## Completion Checklist

- [x] Required migration files are present in repository.
- [x] Local compile check passes (`npm run type-check`).
- [x] Local env keys added for worker/payment/reconciliation flow.
- [x] Health endpoint validates queue-mode config (warn only for optional alert webhook).
- [ ] Migrations 009/010/011/012 applied in staging.
- [ ] Migrations 009/010/011/012 applied in production.
- [ ] Migration 013 applied in staging and production.
- [ ] All required env vars configured.
- [ ] DB admin users bootstrapped in public.admin_users.
- [ ] Internal admin management API validated (list, grant, revoke).
- [ ] In-app dashboard admin panel validated (grant/revoke cycle).
- [ ] Admin audit logs verified for grant/revoke actions.
- [ ] In-app admin audit timeline validated.
- [ ] Audit timeline filter and pagination validated.
- [ ] Audit timeline email search validated.
- [ ] Razorpay webhook configured and tested.
- [ ] Worker cron confirmed.
- [ ] Reconciliation cron confirmed.
- [ ] Payment test passed without double-credit.
- [ ] Reconciliation dry-run reviewed.
- [ ] Repair run completed (if needed).
- [ ] Health and metrics checks passing.
- [x] Landing Phase A extracted to section components.
- [x] Landing Phase B messaging and trust blocks shipped.
- [x] Landing Phase C visual polish validated on desktop/mobile.
- [x] Landing Phase D instrumentation added and tested.
- [x] Dev-mode analytics debug panel added for landing event QA.
- [x] GA4 env-gated sink wired for landing analytics events.
- [x] Landing analytics event matrix documented.
- [x] A/B-ready landing variant and session context attached to events.
- [x] Landing use-case matrix section shipped.
- [x] Landing FAQ section shipped with expand-event tracking.
- [x] Weekly variant comparison analytics report template added.

## 8. Mobile App Plan (Android + iOS)

- [x] Mobile architecture plan documented.
- [x] Phase M0: Bearer-token support added for core user/generate/jobs endpoints.
- [x] Phase M0: API tests added for cookie + bearer auth modes.
- [ ] Phase M1: Expo React Native app scaffold created under mobile/.
- [ ] Phase M1: Supabase mobile auth flows implemented.
- [ ] Phase M2: Create + job status + project list flows implemented.
- [ ] Phase M3: Play Billing + StoreKit purchase verification architecture implemented.
- [ ] Phase M4: Push notifications and staged rollout runbook completed.
