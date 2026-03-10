# Landing Analytics Events

This document defines the landing page analytics event taxonomy used by BharatShort.

## Context Fields Included On Every Event

The tracking layer automatically appends these fields:

- landing_variant: `a` or `b` based on `?variant=` query parameter (defaults to `a`)
- landing_session_id: per-tab session identifier stored in sessionStorage
- page_path: current pathname

## Event Matrix

| Event Name | Trigger | Key Params |
|---|---|---|
| landing_page_view | Landing instrumentation mount on page load | none (context fields only) |
| landing_click_login | Login click from header | location=`header` |
| landing_click_signup | Signup click from any CTA | location=`header` \| `hero_primary` \| `proof` \| `how_it_works` \| `final_cta_primary` |
| landing_click_view_outcomes | Secondary hero CTA click | location=`hero_secondary` |
| landing_click_view_workflow | Final CTA secondary click | location=`final_cta_secondary` |
| landing_section_view_proof | Proof section enters viewport | section_id=`proof` |
| landing_section_view_features | Features section enters viewport | section_id=`features` |
| landing_section_view_how_it_works | How-it-works section enters viewport | section_id=`how-it-works` |
| landing_section_view_use_cases | Use-cases section enters viewport | section_id=`use-cases` |
| landing_section_view_faq | FAQ section enters viewport | section_id=`faq` |
| landing_faq_expand | FAQ item expanded by user | faq_id=`credits_usage` \| `content_ownership` \| `turnaround_time` \| `localization` |

## Notes

- Events are pushed to `gtag` when GA4 is configured via `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
- If GA4 is not configured, events are pushed to `window.dataLayer`.
- In development mode, the analytics debug panel displays captured events in real time.
