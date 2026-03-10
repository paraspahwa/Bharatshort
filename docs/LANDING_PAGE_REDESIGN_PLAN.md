# Landing Page Redesign Plan

## Goal

Design and ship a higher-converting, brand-distinct marketing landing page for BharatShort that improves signup starts, demo exploration, and trust signals without disrupting existing auth and dashboard flows.

## 1. Current State Summary

Current landing implementation:

- src/app/page.tsx
- src/app/globals.css
- src/app/layout.tsx

Current strengths:

- Clear hero and CTA hierarchy.
- Good visual baseline (dark gradient, glass cards, motion accents).
- Feature coverage includes pipeline and workflow sections.

Current architecture limitations:

- Monolithic page composition inside one file makes iterative section experiments harder.
- Messaging is broad and not segmented by user intent (creator, agency, brand).
- Missing trust and proof architecture (customer logos, outcomes, social proof, FAQ depth).
- No explicit conversion instrumentation plan for section-level click behavior.
- Limited narrative progression from problem -> capability -> proof -> action.

## 2. Key Risks and Bottlenecks

1. Conversion risk
- Strong visuals but insufficient proof and differentiation blocks can cap signup intent.

2. Maintainability risk
- Single-page component structure increases merge friction and slows experimentation.

3. Measurement risk
- Without event taxonomy, landing redesign cannot be evaluated objectively.

4. Performance risk
- Rich visual redesign can regress LCP and CLS if not planned with asset budgets.

5. Scope risk
- Big-bang redesign can block delivery and create regressions in navigation and CTA flows.

## 3. Target Architecture

### 3.1 Content and section architecture

Refactor landing into section components under:

- src/app/(marketing)/components/landing/

Proposed section stack:

1. Hero with primary CTA and secondary CTA.
2. Value proposition strip (3 strongest differentiators).
3. Workflow visualization (idea to publish).
4. Use-case matrix (creator, agency, brand).
5. Trust block (logos, testimonials, outcome metrics).
6. Feature deep-dive cards grouped by workflow stage.
7. Pricing and credits explainability teaser with billing link.
8. FAQ block for purchase, credits, ownership, and rendering time.
9. Final conversion band with urgency and confidence cues.

### 3.2 Visual system and UX direction

Maintain current dark premium direction but increase distinctiveness through:

- Stronger typographic hierarchy and tighter copy rhythm.
- More intentional section-to-section transitions.
- Motion limited to meaningful reveals and progress cues.
- Better CTA consistency and repeated conversion points.

### 3.3 Routing and integration

Keep route unchanged:

- src/app/page.tsx remains entry route.

Landing should continue to route users into:

- src/app/signup/page.tsx
- src/app/login/page.tsx
- src/app/dashboard/page.tsx

### 3.4 Analytics instrumentation plan

Add server-safe event taxonomy for key actions:

- landing_cta_primary_click
- landing_cta_secondary_click
- landing_section_view_use_cases
- landing_section_view_pricing_teaser
- landing_faq_expand

Instrumentation can begin with lightweight client events and later be routed to chosen analytics provider.

## 4. Step-by-Step Migration Plan

### Phase A: Foundations

1. Create section component structure under marketing components path.
2. Extract current sections from src/app/page.tsx into isolated components.
3. Preserve existing styles and behavior during extraction.

Rollback point:
- Revert to previous src/app/page.tsx composition.

### Phase B: Messaging and conversion architecture

1. Replace hero copy and CTA hierarchy with clearer value and action framing.
2. Add trust, use-case, and FAQ sections.
3. Add repeated CTA anchors at key narrative breakpoints.

Rollback point:
- Keep extracted components but swap to previous copy blocks.

### Phase C: Visual polish and motion

1. Upgrade section transitions and card layouts.
2. Tune spacing scale and mobile readability.
3. Keep motion budgeted and non-blocking for interaction.

Rollback point:
- Disable enhanced animation utility classes while retaining content.

### Phase D: Instrumentation and optimization

1. Add event hooks for CTAs and FAQ interactions.
2. Run A/B style iterations on hero and CTA text.
3. Tune based on observed conversion and engagement signals.

Rollback point:
- Keep static page with event hooks disabled.

## 5. Validation Strategy

### Functional validation

- Confirm all CTA routes are correct and authenticated flows still work.
- Confirm section rendering on desktop and mobile breakpoints.

### Performance validation

- Measure LCP, CLS, and INP before and after each phase.
- Keep media assets compressed and lazy-loaded where possible.

### Conversion validation

- Track signup click-through rate from primary CTA.
- Track scroll depth to trust, pricing, and FAQ blocks.
- Track FAQ interaction and secondary CTA interaction.

### Rollback strategy

- Each phase keeps page route stable and allows file-level rollback by section.
- No changes to auth, dashboard, worker, payment, or reconciliation APIs required.

## Recommended Immediate Next Build Slice

Start with Phase A plus Hero + Trust section improvements only.
This gives the fastest measurable uplift with low operational risk.
