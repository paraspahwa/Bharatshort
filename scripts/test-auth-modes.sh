#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
COOKIE_HEADER_VALUE="${TEST_COOKIE:-}"
BEARER_TOKEN="${TEST_BEARER_TOKEN:-}"
DUMMY_JOB_ID="${TEST_DUMMY_JOB_ID:-00000000-0000-0000-0000-000000000000}"

pass_count=0
skip_count=0

request_status() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  local auth_header="${4:-}"
  local cookie_header="${5:-}"

  local args=(
    -s
    -o /dev/null
    -w "%{http_code}"
    -X "$method"
    "$url"
  )

  if [[ -n "$auth_header" ]]; then
    args+=(-H "$auth_header")
  fi

  if [[ -n "$cookie_header" ]]; then
    args+=(-H "Cookie: $cookie_header")
  fi

  if [[ -n "$data" ]]; then
    args+=(-H "Content-Type: application/json" -d "$data")
  fi

  curl "${args[@]}"
}

expect_status() {
  local name="$1"
  local expected_csv="$2"
  local actual="$3"

  local matched=1
  IFS=',' read -r -a expected_values <<< "$expected_csv"
  for status in "${expected_values[@]}"; do
    if [[ "$actual" == "$status" ]]; then
      matched=0
      break
    fi
  done

  if [[ "$matched" -ne 0 ]]; then
    echo "FAIL: $name (expected one of [$expected_csv], got $actual)"
    exit 1
  fi

  pass_count=$((pass_count + 1))
  echo "PASS: $name -> $actual"
}

echo "Running auth mode API checks against $BASE_URL"

# Unauthenticated checks
expect_status \
  "unauth /api/user" \
  "401" \
  "$(request_status GET "$BASE_URL/api/user")"

expect_status \
  "unauth /api/generate" \
  "401" \
  "$(request_status POST "$BASE_URL/api/generate" '{"topic":"test"}')"

expect_status \
  "unauth /api/jobs/[jobId]" \
  "401" \
  "$(request_status GET "$BASE_URL/api/jobs/$DUMMY_JOB_ID")"

# Cookie mode checks
if [[ -n "$COOKIE_HEADER_VALUE" ]]; then
  expect_status \
    "cookie /api/user" \
    "200" \
    "$(request_status GET "$BASE_URL/api/user" '' '' "$COOKIE_HEADER_VALUE")"

  expect_status \
    "cookie /api/generate missing topic validation" \
    "400" \
    "$(request_status POST "$BASE_URL/api/generate" '{}' '' "$COOKIE_HEADER_VALUE")"

  expect_status \
    "cookie /api/jobs/[jobId] auth accepted" \
    "404,200" \
    "$(request_status GET "$BASE_URL/api/jobs/$DUMMY_JOB_ID" '' '' "$COOKIE_HEADER_VALUE")"
else
  skip_count=$((skip_count + 1))
  echo "SKIP: cookie-mode checks (set TEST_COOKIE='sb-access-token=...; sb-refresh-token=...')"
fi

# Bearer mode checks
if [[ -n "$BEARER_TOKEN" ]]; then
  expect_status \
    "bearer /api/user" \
    "200" \
    "$(request_status GET "$BASE_URL/api/user" '' "Authorization: Bearer $BEARER_TOKEN")"

  expect_status \
    "bearer /api/generate missing topic validation" \
    "400" \
    "$(request_status POST "$BASE_URL/api/generate" '{}' "Authorization: Bearer $BEARER_TOKEN")"

  expect_status \
    "bearer /api/jobs/[jobId] auth accepted" \
    "404,200" \
    "$(request_status GET "$BASE_URL/api/jobs/$DUMMY_JOB_ID" '' "Authorization: Bearer $BEARER_TOKEN")"
else
  skip_count=$((skip_count + 1))
  echo "SKIP: bearer-mode checks (set TEST_BEARER_TOKEN=<supabase-access-token>)"
fi

echo "Completed auth mode checks: $pass_count passed, $skip_count skipped"
