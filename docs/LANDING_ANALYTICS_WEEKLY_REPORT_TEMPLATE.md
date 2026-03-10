# Landing Analytics Weekly Report Template

Use this template to compare landing performance by variant (`a` vs `b`) each week.

## 1. Weekly Summary

- Week window: <start_date> to <end_date>
- Variant winner this week: <a|b|tie>
- Primary insight: <one-line outcome>
- Recommended action next week: <copy test / CTA test / section ordering test>

## 2. Core Metrics To Compare

- Landing page views (`landing_page_view`)
- Signup clicks (`landing_click_signup`)
- Signup CTR = signup clicks / landing page views
- Secondary CTA clicks (`landing_click_view_outcomes`, `landing_click_view_workflow`)
- Scroll depth proxies (`landing_section_view_proof`, `landing_section_view_features`, `landing_section_view_how_it_works`, `landing_section_view_use_cases`, `landing_section_view_faq`)
- FAQ engagement (`landing_faq_expand`)

## 3. BigQuery SQL Template (GA4 Export)

Replace:
- `<PROJECT>`
- `<DATASET>`
- `<START_DATE>` as YYYYMMDD
- `<END_DATE>` as YYYYMMDD

```sql
WITH base_events AS (
  SELECT
    event_name,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'landing_variant') AS landing_variant,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'landing_session_id') AS landing_session_id,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'location') AS location,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'section_id') AS section_id,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'faq_id') AS faq_id,
    PARSE_DATE('%Y%m%d', event_date) AS event_day
  FROM `<PROJECT>.<DATASET>.events_*`
  WHERE _TABLE_SUFFIX BETWEEN '<START_DATE>' AND '<END_DATE>'
    AND event_name LIKE 'landing_%'
),
weekly AS (
  SELECT
    COALESCE(landing_variant, 'a') AS variant,
    COUNTIF(event_name = 'landing_page_view') AS page_views,
    COUNTIF(event_name = 'landing_click_signup') AS signup_clicks,
    COUNTIF(event_name = 'landing_click_view_outcomes') AS outcomes_clicks,
    COUNTIF(event_name = 'landing_click_view_workflow') AS workflow_clicks,
    COUNTIF(event_name = 'landing_faq_expand') AS faq_expands,
    COUNTIF(event_name = 'landing_section_view_proof') AS view_proof,
    COUNTIF(event_name = 'landing_section_view_features') AS view_features,
    COUNTIF(event_name = 'landing_section_view_how_it_works') AS view_how_it_works,
    COUNTIF(event_name = 'landing_section_view_use_cases') AS view_use_cases,
    COUNTIF(event_name = 'landing_section_view_faq') AS view_faq
  FROM base_events
  GROUP BY variant
)
SELECT
  variant,
  page_views,
  signup_clicks,
  SAFE_DIVIDE(signup_clicks, page_views) AS signup_ctr,
  outcomes_clicks,
  workflow_clicks,
  faq_expands,
  view_proof,
  view_features,
  view_how_it_works,
  view_use_cases,
  view_faq
FROM weekly
ORDER BY variant;
```

## 4. Interpretation Checklist

- If variant B has higher signup CTR with similar or better page views, keep B and iterate copy depth.
- If scroll depth reaches use-cases but not FAQ, tighten transition into FAQ headline.
- If FAQ expands are high but signup clicks are flat, strengthen post-FAQ CTA wording.
- If primary CTA clicks are high but dashboard signups are low, audit signup flow friction.

## 5. Reporting Table (Fill Weekly)

| Variant | Page Views | Signup Clicks | Signup CTR | FAQ Expands | Use-Cases Views | Recommended Action |
|---|---:|---:|---:|---:|---:|---|
| A |  |  |  |  |  |  |
| B |  |  |  |  |  |  |
