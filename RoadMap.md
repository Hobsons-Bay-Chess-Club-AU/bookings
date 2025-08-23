## Bookings Platform Roadmap

This roadmap tracks upcoming improvements and larger features for the bookings system. It’s organized by phases (Quick Wins, High-Impact, Advanced), with details for goals, scope, data model/API impacts, UI, risks, and success metrics.

### Phase 1 — Quick Wins (0–4 weeks)

- **Table density and actions discoverability**
  - **Goal**: Ensure actions are always visible without horizontal scroll; improve readability on smaller screens.
  - **Scope/UX**: Default truncate long columns; sticky actions column; tooltips for truncated text; consistent column width presets by view.
  - **Data/API**: None.
  - **UI**: Participants/Bookings/Event lists; apply Tailwind utilities (`truncate`, max-w, sticky right).
  - **Risks**: Sticky columns on mobile; verify z-index with menus.
  - **Success**: No overflow-induced hidden actions; ≤1% scroll-to-act issues in feedback.

- **Export presets**
  - **Goal**: Allow organizers to quickly export common CSVs.
  - **Scope/UX**: Saved export presets per view (e.g., “Check-in list”, “Finance report”).
  - **Data/API**: Add `export_presets` JSONB per organizer or event.
  - **UI**: “Export” button with preset dropdown; manage presets modal.
  - **Risks**: Data privacy; respect roles.
  - **Success**: 2+ presets used by >50% organizers.

- **Replace emojis with `react-icons` (consistency)**
  - **Goal**: UI consistency and accessibility.
  - **Scope/UX**: Replace remaining emojis in web UI with `react-icons/hi2`; keep email templates text-only.
  - **Data/API**: None.
  - **UI**: Sweep across organizer and public views.
  - **Risks**: None.
  - **Success**: 0 remaining emojis in React UI (except content).

### Phase 2 — High-Impact (1–2 months)

- **Waitlist & auto-invite**
  - **Goal**: Capture excess demand and auto-fill cancellations.
  - **Scope/UX**: Users join waitlist when full; auto-promote in order with configurable invite window (e.g., 12–24h). Reminders before expiry; manual promote.
  - **Data model**: `waitlist_entries` (event_id, profile_id, priority, status, invite_expires_at, notes); booking hold tokens.
  - **API**: POST/DELETE `/api/events/[id]/waitlist`; POST `/api/events/[id]/waitlist/promote`.
  - **UI**: Public event page “Join Waitlist”; Organizer waitlist tab with drag-to-reprioritize.
  - **Risks**: Abuse/spam; add hCaptcha/Rate limit.
  - **Success**: ≥20% of cancellations backfilled; low expired invites.

- **Check‑in & attendance**
  - **Goal**: Fast on-site validation and attendance analytics.
  - **Scope/UX**: QR on tickets; organizer check-in screen; statuses (arrived, late, no-show), manual override.
  - **Data model**: `attendance_events` (participant_id, status, by_user_id, ts); `tickets` already exist.
  - **API**: POST `/api/tickets/[bookingId]/check-in`; GET attendance summary.
  - **UI**: Organizer “Check-in” view; per-participant badge; export.
  - **Risks**: Offline mode; consider local cache + retry.
  - **Success**: Median scan-to-confirm < 1s; accurate counts.

- **Refunds & adjustments**
  - **Goal**: Flexible post-purchase operations.
  - **Scope/UX**: Partial refunds, line-level notes, credits/vouchers; audit trail.
  - **Data model**: `refunds` (booking_id, amount, reason, actor_id, ts); `credits` ledger.
  - **API**: POST `/api/bookings/[bookingId]/refund`; POST `/api/credits/grant`.
  - **UI**: Booking details “Refund/Adjust” dialog; finance export.
  - **Risks**: Stripe tax/fee handling; permissions.
  - **Success**: <2% refund errors; reconcilable totals.

- **Discounts 2.0**
  - **Goal**: Richer promotions without support overhead.
  - **Scope/UX**: Stacking rules, per-user and global caps, section-scoped, referral codes.
  - **Data model**: Extend `discounts` with stacking/limits; `discount_usages` table.
  - **API**: Calculate endpoints already exist; add validations.
  - **UI**: New “Rules” step in discount editor; usage dashboards.
  - **Risks**: Combinatorics; deterministic application order.
  - **Success**: No more than 1 support ticket/week about discounts.

- **Automations**
  - **Goal**: Lifecycle messaging to reduce churn and no-shows.
  - **Scope/UX**: Pre-event reminders, “what to bring”, post-event follow-up; failed-payment dunning; win-back flows.
  - **Infra**: Background jobs with durable queue (e.g., `pg-boss`/QStash/Cloud Tasks). Idempotent handlers.
  - **Data model**: `scheduled_jobs` with status, retries; `email_events`.
  - **UI**: Organizer “Automations” composer with templates and triggers.
  - **Success**: -20% no-shows; +10% repeat bookings.

### Phase 3 — Advanced (2–4 months)

- **Teams/Groups**
  - **Goal**: Support captains/parents booking for multiple participants.
  - **Scope/UX**: Group booking flow; leader contact; bulk transfers; seat allocation per section.
  - **Data model**: `groups` (leader_id); `group_members`; `booking_group_id`.
  - **API**: Group CRUD; transfer endpoints support groups.
  - **UI**: Group details in organizer views; batch actions.
  - **Risks**: Edge cases with partial refunds/attendance.

- **Membership sync & validation**
  - **Goal**: Trustworthy member pricing and eligibility.
  - **Scope/UX**: Live verification against FIDE/ACF/club; grace periods; cached proofs.
  - **Data model**: `membership_verifications` (source, external_id, proof, expires_at).
  - **API**: Verification endpoints + webhooks for refresh.
  - **UI**: “Verified” badges; filters.
  - **Risks**: Rate limits/availability from providers.

- **Installments & payment options**
  - **Goal**: Increase conversion for higher prices.
  - **Scope/UX**: Pay-in-two/three; Apple/Google Pay; Stripe Tax where applicable.
  - **Data model**: `payment_schedules`; `installment_payments`.
  - **API**: Create schedules; capture pending installments; dunning.
  - **UI**: Checkout choice; organizer schedule templates.
  - **Risks**: Edge runtimes vs Stripe Node SDK; isolate to Node runtime routes.

- **Security & roles**
  - **Goal**: Safer delegation and audits.
  - **Scope/UX**: Roles (Organizer, Staff, Finance, Viewer); permission matrix per action; export access logs.
  - **Data model**: `roles`, `permissions`, `role_assignments`, `audit_log` expansion.
  - **API**: Authorization checks in middleware/util layer.
  - **UI**: Role management on organizer settings; action tooltips when denied.

### Engineering & DX backlog

- **Background jobs**: Standardize job runner; retries, DLQ, observability.
- **Runtime boundaries**: Avoid Node-only SDKs in Edge routes; move to Node handlers as needed.
- **Caching**: Adopt ISR for heavy public pages; cache busting on data mutation.
- **Testing**: Smoke e2e for checkout; fixtures for Stripe/Supabase; visual regression on key tables.
- **Observability**: Add app-level metrics (bookings, refunds, failed payments), alert thresholds.

### Prioritization suggestions

1) Phase 1 (ship fast): table density/actions, export presets, icon pass.
2) Phase 2: waitlist + check-in + refunds (biggest organizer value); start automations foundation.
3) Phase 3: discounts 2.0 and roles; then teams/membership/installments per demand.

### Notes

- Emails: keep icons out of templates for broad client compatibility; use text labels.
- Accessibility: ensure keyboard navigation and ESC/Click-outside work on all modals/menus.
- Internationalization: consider date/number locale options in organizer settings.



