# Admin and Normal User Access Test Cases

## Scope
This suite validates role-based access behavior for:
- User dashboard: `/dashboard`
- Admin dashboard: `/admin`
- Admin session endpoint: `/api/internal/admin/session`
- Admin internal endpoints under `/api/internal/*`

## Test Data
Create or use these accounts:
- `admin@admin.com` (active in `public.admin_users`, `is_active = true`)
- `user@normal.com` (not present in `public.admin_users`)

## Environment Preconditions
- App is running locally.
- `WORKER_SECRET` is configured.
- `SUPABASE_SERVICE_ROLE_KEY` is configured.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured.

## Test Cases

### TC-ADM-001: Unauthenticated user cannot access /admin
- Role: Unauthenticated
- Steps:
1. Open `/admin` in a private/incognito tab.
- Expected:
1. Response is redirect to `/login?redirect=/admin`.
2. Admin content is not visible.

### TC-ADM-002: Normal user cannot access /admin
- Role: Normal user
- Steps:
1. Login as `user@normal.com`.
2. Open `/admin`.
- Expected:
1. Redirect to `/dashboard`.
2. No admin panels shown.

### TC-ADM-003: Admin user can access /admin
- Role: Admin user
- Steps:
1. Login as `admin@admin.com`.
2. Open `/admin`.
- Expected:
1. Admin page renders and stays open.
2. Header shows BharatShort Admin.
3. Worker/Reconciliation/Admin Access/Unit Economics panels are accessible (or partial-data warning if optional services fail).

### TC-ADM-004: Dashboard shows Admin Panel button for admin only
- Role: Admin user and normal user
- Steps:
1. Login as `admin@admin.com`; open `/dashboard`.
2. Verify presence of Admin Panel button in top-right header.
3. Logout; login as `user@normal.com`; open `/dashboard`.
- Expected:
1. Admin user sees Admin Panel button.
2. Normal user does not see Admin Panel button.

### TC-ADM-005: Admin Panel button navigates to /admin
- Role: Admin user
- Steps:
1. Login as `admin@admin.com`.
2. Open `/dashboard`.
3. Click Admin Panel button.
- Expected:
1. Browser navigates to `/admin`.
2. Admin page loads successfully.

### TC-ADM-006: /dashboard remains user-focused for both roles
- Role: Admin user and normal user
- Steps:
1. Login as each role separately.
2. Open `/dashboard`.
- Expected:
1. User dashboard cards/projects are visible.
2. Admin-only panels do not render on `/dashboard`.

### TC-ADM-007: Admin session endpoint returns isAdmin for admin
- Role: Admin user
- Steps:
1. Login as `admin@admin.com` in browser.
2. Open `/api/internal/admin/session`.
- Expected:
1. `200` response.
2. JSON contains `{ "isAdmin": true }`.

### TC-ADM-008: Admin session endpoint denies unauthenticated
- Role: Unauthenticated
- Steps:
1. In private/incognito, open `/api/internal/admin/session`.
- Expected:
1. `401` response.

### TC-ADM-009: Admin session endpoint returns false for normal user
- Role: Normal user
- Steps:
1. Login as `user@normal.com`.
2. Open `/api/internal/admin/session`.
- Expected:
1. `200` response.
2. JSON contains `{ "isAdmin": false }`.

### TC-ADM-010: Normal user blocked from admin internal API routes
- Role: Normal user
- Steps:
1. Login as `user@normal.com`.
2. Call each endpoint:
   - `/api/internal/admin/dashboard-users`
   - `/api/internal/admin/dashboard-audit`
   - `/api/internal/jobs/dashboard-metrics`
   - `/api/internal/payments/dashboard-reconcile`
   - `/api/internal/costs/dashboard-summary`
- Expected:
1. Each returns `403` (or `401` if session is missing).
2. No sensitive admin payload returned.

### TC-ADM-011: Admin user can access admin internal API routes
- Role: Admin user
- Steps:
1. Login as `admin@admin.com`.
2. Call same endpoints listed in TC-ADM-010.
- Expected:
1. `200` responses for authorized routes.
2. Valid JSON payload for each route.

### TC-ADM-012: /admin optional panel retry works without redirect
- Role: Admin user
- Steps:
1. Login as `admin@admin.com` and open `/admin`.
2. Simulate partial service failure (e.g., temporary API timeout or endpoint failure).
3. Verify warning banner appears.
4. Click `Retry failed panels`.
- Expected:
1. Page stays on `/admin` (no redirect to `/dashboard`).
2. Failed optional panels re-fetch.
3. Warning disappears when services recover.

### TC-ADM-013: Admin can grant admin access via /admin page
- Role: Admin user
- Steps:
1. Login as `admin@admin.com` and open `/admin`.
2. In Dashboard Admin Access section, enter `user@normal.com` and click Grant Admin.
3. Logout and login as `user@normal.com`.
4. Open `/dashboard`.
- Expected:
1. Grant action succeeds.
2. Former normal user now sees Admin Panel button.

### TC-ADM-014: Admin can revoke admin access via /admin page
- Role: Admin user
- Steps:
1. Ensure `user@normal.com` is active admin.
2. Login as `admin@admin.com`, open `/admin`.
3. Revoke `user@normal.com`.
4. Login as `user@normal.com`, open `/dashboard`.
- Expected:
1. Revoke action succeeds.
2. User no longer sees Admin Panel button.
3. `/admin` redirects that user to `/dashboard`.

## Regression Checklist
Run these after any auth/role changes:
1. `/dashboard` is accessible for authenticated users.
2. `/admin` guard works for unauthenticated and non-admin users.
3. Admin-only endpoints enforce role checks.
4. Admin button visibility on `/dashboard` remains role-correct.
5. No redirect loops occur between `/admin`, `/dashboard`, and `/login`.
