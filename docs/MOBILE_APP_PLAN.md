# Mobile App Plan (Android + iOS)

## Goal

Ship a production-grade BharatShort mobile app for Android and iOS with shared code, reusing the current backend and data model where possible, while minimizing regressions in generation, credits, and payments.

## 1. Current State Summary

The web platform already has mobile-reusable backend primitives:

- Generation entrypoint: src/app/api/generate/route.ts
- Job polling/status: src/app/api/jobs/[jobId]/route.ts
- User summary endpoint: src/app/api/user/route.ts
- Queue and worker orchestration: src/lib/queue.ts, src/lib/video-generator.ts, src/lib/video-processor.ts
- Credits and transactions: src/lib/credits.ts, Supabase tables/migrations in supabase/migrations
- Payments + reconciliation: docs/API.md, internal payment endpoints under src/app/api/internal/payments
- Auth and sessions: Supabase helpers in src/lib/supabase.ts and route handlers using cookie sessions

Key implication:

- Core product logic is backend-first and can be consumed by a native app with a thin API adaptation layer.

## 2. Key Risks and Bottlenecks

1. Auth coupling risk
- Existing APIs rely on Supabase cookie sessions; mobile SDKs naturally use access token headers.

2. Payment surface mismatch
- Current payment flow is Razorpay web-driven; native app stores require Play Billing / StoreKit for in-app digital goods.

3. Long-running generation UX
- Mobile needs resilient background-safe progress handling and reconnect-safe polling/subscription strategy.

4. Media delivery and storage costs
- Video preview/download on mobile can increase CDN egress and on-device storage pressure.

5. Operational fragmentation
- Running web + mobile without shared contracts can create drift and regressions.

## 3. Target Architecture

### 3.1 Client stack choice

Recommended:

- React Native with Expo (TypeScript), single codebase for Android + iOS.

Why:

- Fastest time-to-deliver with shared product logic and UI primitives.
- Good Supabase client support.
- Strong OTA/release tooling and push integration path.

Alternative considered:

- Flutter.

Decision:

- Keep velocity and stack alignment by choosing React Native/Expo.

### 3.2 Module boundaries

Create a new app workspace folder:

- mobile/

Proposed mobile modules:

- mobile/src/features/auth
- mobile/src/features/generation
- mobile/src/features/projects
- mobile/src/features/payments
- mobile/src/features/profile
- mobile/src/lib/api (typed API client)
- mobile/src/lib/supabase (token/session handling)
- mobile/src/lib/analytics

Dependency direction:

- UI screens -> feature hooks/services -> typed api client -> backend endpoints.
- No direct provider-specific logic in screens.

### 3.3 API and contract strategy

Reuse existing endpoints where possible:

- POST /api/generate
- GET /api/jobs/[jobId]
- GET /api/user

Add mobile-compatible auth contract layer:

- Keep existing cookie behavior for web.
- Add Authorization: Bearer token support in key user endpoints.

Preferred pattern:

- Shared server helper to resolve user from either Supabase cookie session or bearer JWT.

Add mobile convenience endpoints (phase-gated):

- GET /api/projects?cursor=... (pagination for project history)
- GET /api/projects/[projectId] (details + assets)
- POST /api/mobile/notifications/register (device token registration)

### 3.4 Payments strategy (mobile-safe)

Policy:

- Web keeps Razorpay.
- Mobile uses platform billing for in-app digital credits.

Backend model:

- Add app_store_orders table (or generalized purchases table) with source = play|app_store|web_razorpay.
- Keep a single atomic credit grant RPC for all payment sources.

Idempotency:

- Use provider transaction ID as unique key.
- Verify receipt server-side before credit grant.

### 3.5 Async workflow UX

Mobile generation lifecycle:

- Create job -> optimistic project card -> poll status endpoint with exponential backoff.
- On app resume, rehydrate pending jobs and continue polling.
- Optional later: push notifications for completion/failure.

State transitions remain backend source-of-truth:

- queued -> processing -> completed|failed.

### 3.6 Observability and analytics

Track mobile funnel events similar to landing taxonomy:

- mobile_auth_login_success
- mobile_generate_start
- mobile_generate_complete
- mobile_generate_failed
- mobile_credits_purchase_start
- mobile_credits_purchase_complete

Correlate with:

- user_id
- platform (android|ios)
- app_version
- build_channel (dev|staging|prod)

## 4. Step-by-Step Migration Plan

### Phase M0: Contract hardening (backend-first)

1. Add bearer-token auth support to generation/user/job endpoints.
2. Add typed response contracts and shared validation.
3. Add API tests for cookie and bearer auth paths.

Rollback point:

- Keep web cookie path unchanged; disable bearer parsing behind flag.

### Phase M1: Mobile foundation

1. Create mobile/ Expo app skeleton.
2. Implement Supabase auth flows (signup/login/logout/session restore).
3. Implement base navigation + theme + network client.

Rollback point:

- Mobile app can remain internal-only without impacting web.

### Phase M2: Core generation experience

1. Build Create screen mapped to POST /api/generate.
2. Build Job status screen mapped to GET /api/jobs/[jobId].
3. Build Project list/details using new project endpoints.

Rollback point:

- Disable generation entry in mobile via remote config flag.

### Phase M3: Mobile payments and credits

1. Implement Play Billing and StoreKit purchase flow.
2. Add backend receipt verification endpoints.
3. Route verified purchases through atomic credit-grant RPC.

Rollback point:

- Keep mobile purchase CTA hidden while preserving read-only credits view.

### Phase M4: Notifications, reliability, and release hardening

1. Add push token registration and completion notifications.
2. Add crash/error monitoring and release analytics.
3. Ship staged rollout: internal -> beta -> production.

Rollback point:

- Disable push and keep polling fallback.

## 5. Validation Strategy

### Functional tests

- Auth: signup/login/session restore/logout on Android/iOS.
- Generation: start job, resume app, receive final status.
- Credits: deduction and purchase idempotency.
- Projects: pagination and detail rendering.

### Reliability checks

- Retry behavior for flaky mobile networks.
- Duplicate request safety through idempotency keys.
- Receipt replay resistance for purchases.

### Performance checks

- Cold start under target budget.
- Smooth list scrolling for projects.
- Controlled video preview/download behavior.

### Release gates

- 0 blocker crashes in beta cohort window.
- Generation completion rate within expected range.
- Purchase verification success rate above threshold.

## 6. Recommended Immediate Build Slice

Start with M0 + M1 only:

1. Backend bearer auth compatibility for existing endpoints.
2. Expo app skeleton with Supabase auth and dashboard summary from GET /api/user.

This gives the fastest path to a testable Android/iOS shell while preserving web stability.