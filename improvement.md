# TruliCares — Scalability, Reliability & Feature Improvement Plan

> Living document. Tracks the architecture upgrade from the current single‑process
> Vercel deployment to a horizontally scalable platform (Redis cache + rate limiting,
> BullMQ background workers, branded transactional email via Resend, Checkr background
> checks, staffing in‑app chat) plus the remaining product‑gap fixes.

Last updated: 2026‑06‑02

---

## 0. Guiding principles

1. **Never break the live site.** The API deploys to **Vercel serverless**
   (`apps/api/api/index.ts` → `apps/api/vercel.json`). Every new dependency
   (Redis, BullMQ, Checkr, sharp) is **optional at runtime**: if its environment
   variable is missing the code falls back to the previous behaviour
   (in‑memory cache, in‑memory rate limit, direct email send, no‑op background check).
   This lets us merge & deploy infrastructure *before* the external services are
   provisioned, with zero downtime.
2. **Workers run off‑Vercel.** Vercel serverless functions are ephemeral and cannot
   host a long‑lived BullMQ worker or a persistent Redis pool. The API (Vercel) only
   **produces** jobs; a separate always‑on Node process (`npm run worker`) **consumes**
   them. Deploy the worker to Railway / Render / Fly.io / a small VPS.
3. **Serverless‑safe Redis.** Use a global singleton `ioredis` connection that is
   reused across warm invocations (avoids connection storms). Upstash Redis (TLS) is
   the recommended provider; any Redis 6+ works for the worker host.
4. **Secrets via env only.** No credentials in code. All new settings are added to
   `.env.example` with safe placeholders.

---

## 1. Target architecture

```
                ┌─────────────────────────────┐
   Browser ───▶ │  Vercel (apps/web static)   │
                └─────────────────────────────┘
                                │  /api/*
                                ▼
                ┌─────────────────────────────┐        ┌──────────────────┐
                │ Vercel Serverless (apps/api)│──cache─▶│  Upstash Redis    │
                │  • REST controllers         │──queue─▶│  (cache + BullMQ) │
                │  • enqueues jobs only        │        └──────────────────┘
                └─────────────────────────────┘                 ▲
                       │                                          │ consumes
                       ▼                                          │
                ┌─────────────────────────────┐        ┌──────────────────┐
                │  Supabase Postgres + Storage │◀───────│  Worker process   │
                │  + Realtime broadcasts       │  jobs  │  (Railway/Render) │
                └─────────────────────────────┘        │  • email (Resend) │
                                                        │  • image (sharp)  │
                                                        │  • notifications  │
                                                        │  • cleanup/cron   │
                                                        │  • reports        │
                                                        └──────────────────┘
                External: Stripe · Resend · Checkr (webhooks → Vercel API)
```

---

## 2. Workstreams & status

| # | Workstream | Module | Status |
|---|-----------|--------|--------|
| 1 | Redis connection + serverless singleton | infra | ☐ |
| 2 | Redis cache service (+ health check, in‑mem fallback) | infra | ☐ |
| 3 | Redis rate limiter + strict per‑route limits | infra/auth | ☐ |
| 4 | BullMQ queues / producers / worker / start cmd | infra | ☐ |
| 5 | Branded email templates (13) + Resend service refactor | both | ☐ |
| 6 | Email sending moved into worker (no controller sends) | both | ☐ |
| 7 | Sharp image optimization (queue + storage) | both | ☐ |
| 8 | Checkr background‑check integration | marketplace | ☐ |
| 9 | Staffing in‑app chat + real profile avatars | staffing | ☐ |
| 10 | Gap bug fixes (check‑in widget, payout, escrow auto‑release, geofence, dispute resolution) | staffing | ☐ |
| 11 | Cleanup / cron jobs (expired tokens, stuck escrow, OTP purge) | infra | ☐ |

---

## 3. Environment variables (added to `.env.example`)

```ini
# ── Redis (Upstash recommended) ──────────────────────────────
# Used by both the API (cache + rate limit + queue producer) and the worker.
REDIS_URL=rediss://default:<password>@<host>.upstash.io:6379
# Optional: disable Redis entirely (falls back to in-memory). Leave unset to enable.
# REDIS_DISABLED=true

# ── BullMQ ───────────────────────────────────────────────────
QUEUE_PREFIX=trulicares
# Concurrency for the worker process
WORKER_CONCURRENCY=5

# ── Email identity (Resend) ──────────────────────────────────
RESEND_API_KEY=re_...
EMAIL_FROM_NAME=TruliCares
EMAIL_FROM_ADDRESS=noreply@trulicares.com
EMAIL_SUPPORT_ADDRESS=support@trulicares.com
EMAIL_ADMIN_ADDRESS=admin@trulicares.com
# Public base URL used inside email links/logo
APP_URL=https://www.trulicares.com
EMAIL_LOGO_URL=https://www.trulicares.com/logo.png

# ── Checkr background checks ─────────────────────────────────
CHECKR_API_KEY=
CHECKR_WEBHOOK_SECRET=
# 'test' or 'live' — controls the package slug & base URL
CHECKR_ENV=test
# default package slug to order
CHECKR_PACKAGE=test_pro_criminal
```

> **Vercel:** add all of the above to the API project's Environment Variables.
> **Worker host:** needs `REDIS_URL`, `DATABASE_URL`, `RESEND_API_KEY`, the `EMAIL_*`
> identity vars, `SUPABASE_*`, and `APP_URL`.

---

## 4. Resend DNS / domain verification (required for production deliverability)

1. In Resend → **Domains** → add `trulicares.com`.
2. Add the DNS records Resend shows at your registrar:
   - **SPF** (TXT): `v=spf1 include:amazonses.com ~all` (or Resend's value).
   - **DKIM** (3 CNAME records `resend._domainkey...`).
   - **DMARC** (TXT `_dmarc`): `v=DMARC1; p=none; rua=mailto:dmarc@trulicares.com`.
   - Optional **MX** for the `send.` subdomain (bounce handling).
3. Wait for "Verified", then `EMAIL_FROM_ADDRESS` must be `@trulicares.com`.
4. Until verified, Resend only delivers to the account owner's address; the code
   logs a mock send when `RESEND_API_KEY` is unset.

---

## 5. Required email notifications (the 13 templates)

All rendered from a shared branded base layout (logo header, brand colours, button,
footer with support link). Each has a typed payload and a queue job name.

| Template key | Trigger | Recipient | Module |
|---|---|---|---|
| `forgot-password` | password reset requested | user | both |
| `email-verification` | signup / verify email (OTP or link) | user | both |
| `welcome` | account created | user | both |
| `login-alert` | new device/login | user | both |
| `new-message` | new chat message (debounced) | recipient | both |
| `care-request` | family books / requests care, shift posted/applied | caregiver / family / facility / pro | both |
| `admin-notification` | new report, dispute, verification queue item | admin | both |
| `payment-confirmation` | Stripe payment succeeded (messaging unlock, bg check, shift) | payer | both |
| `account-approval` | verification approved | caregiver / professional / facility | both |
| `account-rejection` | verification rejected | caregiver / professional / facility | both |
| `password-changed` | password successfully changed | user | both |
| `security-alert` | suspicious activity / suspension | user | both |
| `generic-notification` | catch‑all in‑app notification mirror | any | both |

Producer: `enqueueEmail(template, to, data)` → BullMQ `email` queue → worker renders +
sends via Resend. **Controllers never call Resend directly.**

---

## 6. BullMQ queues

| Queue | Jobs | Producer location | Notes |
|---|---|---|---|
| `email` | one job per template send | everywhere (via `enqueueEmail`) | retry 5×, exp backoff |
| `image` | `optimize-avatar` | profile photo upload | sharp resize→webp, then Supabase Storage |
| `notification` | `fan-out` persistent notif + realtime broadcast + optional email | match/booking/message events | |
| `cleanup` | `purge-expired-otps`, `release-stuck-escrow`, `prune-reset-tokens` | repeatable (cron) | scheduled by worker on boot |
| `report` | `admin-analytics-export` | admin dashboard export button | heavy aggregation off the request path |

Worker entry: `apps/api/src/worker.ts` → `npm run worker` (and `worker:dev`).
Failed jobs log a redacted summary (job name, id, attempt, error message — **no PII/body**).

---

## 7. Caching plan (what gets cached, TTL, invalidation)

| Data | Key | TTL | Invalidate on |
|---|---|---|---|
| Caregiver list / search results | `cg:list:<filtersHash>` | 60s | caregiver profile update, verification change |
| Caregiver public profile card | `cg:profile:<id>` | 120s | that caregiver's profile update |
| Open shifts browse | `shifts:open:<filtersHash>` | 30s | shift post/edit/fill/cancel |
| Admin stats | `admin:stats` | 60s | n/a (short TTL) |
| Resources/blog articles | `resources:all` | 600s | n/a |

Cache service API stays the same signature (`getCached`/`setCached`/`invalidateCache`)
so existing call sites keep working; the implementation becomes Redis‑backed with an
in‑memory fallback.

---

## 8. Rate limiting plan

Redis‑backed sliding/fixed window keyed by IP (+ email for auth). Strict buckets:

| Endpoint(s) | Limit |
|---|---|
| `POST /api/auth/login` | 5 / 15 min per IP+email |
| `POST /api/auth/register` | 5 / hour per IP |
| `POST /api/auth/forgot-password` | 3 / hour per IP+email |
| OTP request/verify | 5 / 15 min per IP+email |
| photo upload endpoints | 10 / 10 min per user |
| search / caregiver list / shift browse | 60 / min per IP |
| global `/api/*` default | 100 / 15 min per IP (unchanged) |

Temporary tokens/counters in Redis: OTP codes (`otp:<email>`, TTL 10 min), password
reset attempt counters, login‑failure counters for lockout.

---

## 9. Checkr background‑check flow (marketplace)

Replaces the manual $39 "premium background check" stub. Mirrors Care.com‑style flow:

1. Caregiver (or family paying for caregiver) clicks **Run Background Check** →
   existing Stripe `$39` checkout (`isBackgroundCheck`) stays as the paywall.
2. On payment success (Stripe webhook), enqueue `notification`/Checkr order:
   - Create/get a **Checkr candidate** for the caregiver (`POST /candidates`).
   - Create an **invitation** (`POST /invitations`, package `CHECKR_PACKAGE`) →
     Checkr emails the caregiver a secure form to enter SSN/DOB (PII never touches us).
3. Persist `checkr_candidate_id`, `checkr_report_id`, `background_check_status` on
   `caregiver_profiles` / `professional_profiles` (`pending`).
4. **Checkr webhook** (`POST /api/checkr/webhook`, signature‑verified via
   `CHECKR_WEBHOOK_SECRET`) updates status on `report.completed` /
   `report.{clear,consider}` → set `clear`→approved, `consider`→needs review (admin),
   broadcast realtime + `account-approval`/`security-alert` email.
5. Admin verification queue shows Checkr status and links to the report.

Graceful fallback: if `CHECKR_API_KEY` unset, keep current manual admin approval path.

---

## 10. Staffing in‑app chat

Family↔caregiver chat stays as‑is. Add a **separate** facility↔professional thread so
the two products don't share a table.

- Migration `2024xxxx_staffing_conversations.sql`:
  `staffing_conversations(id, facility_id, professional_id, booking_id, created_at, updated_at)`
  and `staffing_messages(id, conversation_id, sender_id, content, is_read, created_at)`.
  A conversation is created when an application is **accepted** (booking exists), so
  only matched parties can talk.
- Routes `apps/api/src/routes/staffing/messages.ts` mounted at
  `/api/staffing/conversations` (list, get thread, send, mark‑read). Realtime via the
  existing Supabase broadcast channels (`professional:<id>` / `facility:<id>`).
- Frontend: a `StaffingChat` view + a "Messages" nav item in both staffing dashboards,
  reusing the marketplace chat UI components.
- **Real avatars everywhere:** `Avatar` component that uses `photo_url` when present,
  otherwise a deterministic colored initials fallback. Replace ad‑hoc initial circles
  in chat lists/headers.

---

## 11. Gap bug fixes

| Gap | Fix |
|---|---|
| Pro dashboard "Active Shift" widget is a hardcoded stub (`2h 45m`, dead button) | Import the real `components/staffing/CheckInTimer` into the Overview; remove the local stub. |
| Wallet withdrawal isn't a real payout | Create a `withdrawals` record + enqueue payout job; document Stripe Connect payout wiring; show "processing" status to the pro. |
| Escrow never auto‑releases if facility forgets | `cleanup` repeatable job: auto‑complete + release escrow N hours after `checked_out` with no dispute; notify both parties. |
| Geofence stubbed (`isNearLocation=false`) | Use `utils/geolocation` + browser geolocation on check‑in; compare to shift coords; warn (not block) when far; store distance on booking. |
| Dispute resolution one‑directional | Admin resolve endpoint: `resolved`→release to pro or `refunded`→refund facility (Stripe refund), close dispute, notify both, email. |
| Tracked build artifacts / scratch scripts | Add to `.gitignore` (separate housekeeping commit). |

---

## 12. Rollout order (safe, incremental commits)

1. **Infra foundation** (graceful, additive): env, deps, Redis, cache, rate limit,
   BullMQ scaffolding, worker entry. *(no behaviour change without `REDIS_URL`)*
2. **Email system**: templates + service refactor + worker email processor + wire flows.
3. **Sharp** image optimization in upload path.
4. **Checkr** service + webhook + flow.
5. **Staffing chat** migration + routes + UI + avatars.
6. **Gap fixes** (check‑in widget first — self‑contained — then payout/escrow/geofence/dispute).
7. **Cleanup/cron** jobs.
8. **Housekeeping**: gitignore build artifacts.

Each step compiles (`tsc`) and is pushed so Vercel redeploys incrementally.

---

## 13. Operational runbook (post‑merge)

- Provision Upstash Redis → set `REDIS_URL` on Vercel **and** the worker host.
- Deploy worker: `npm ci && npm run build -w apps/api && npm run worker` (Railway/Render).
  Worker needs the same DB/Resend/Supabase env as the API.
- Verify Resend domain (section 4).
- Create Checkr account, set `CHECKR_*`, register webhook → `https://<api>/api/checkr/webhook`.
- Smoke test: signup (welcome email), forgot‑password, upload avatar (webp in Storage),
  enqueue depth in Upstash, worker logs.

---

## 14. Done / changelog

- **Phase 1 — scalability backbone** (commit: Redis/BullMQ/email): Redis singleton +
  health check, two-tier cache, Redis rate limiter + strict presets, BullMQ queues/
  worker/producers with graceful inline fallback, 13 branded email templates, Resend
  service refactor (enqueue-only), sharp inline avatar optimization. All gated on
  `REDIS_URL` so the live deploy is unaffected until provisioned.
- **Phase 2 — Checkr**: candidate+invitation flow on bg-check payment, signature-verified
  webhook, status columns + auto-migrate, approval/security emails, manual fallback.
- **Phase 3 — staffing chat + avatars**: `staffing_conversations`/`staffing_messages`
  tables (+ auto-migrate), `/api/staffing/conversations` routes, auto-created thread on
  application accept, `StaffingChat` view + Messages nav in both staffing dashboards,
  reusable `Avatar` (real photo / initials fallback).
- **Phase 4 — gap fixes**: real `CheckInTimer` wired into the pro Overview (removed the
  hardcoded "2h 45m" stub); dispute resolution now releases escrow to the pro or refunds
  the facility via Stripe (was status-only); escrow auto-release cleanup job for forgotten
  confirmations; withdrawals ledger table for auditable payout requests.

### Still open (documented, lower priority)
- Stripe Connect payouts for real wallet withdrawals (table + status tracking are in place).
- Geofenced check-in: needs shift lat/lng stored; the real `CheckInTimer` is wired and
  `utils/geolocation` exists — capture+compare is the remaining step.
- Admin dashboard UI for the new dispute `outcome` (release/refund) control.
- Housekeeping: gitignore tracked `dist/`, `dist-server/`, scratch scripts.
