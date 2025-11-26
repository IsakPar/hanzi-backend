# Hanzimaster Backend – Audit & Remediation Plan

_Last updated: Nov 23, 2025_

---

## 1. Plain-English Description of the Backend

- **Who it serves:** Learners use public endpoints to browse lessons and stream content; staff use admin endpoints to curate lessons/content and drive AI-assisted lesson generation.
- **Where it runs:** A single Cloudflare Worker (Hono) backed by D1 for relational data (lessons, users, analytics) and R2 for large media objects (audio, video, PDFs).
- **What it must guarantee:**
  - Reliable CRUD for lessons, content library, tags, and user progress.
  - Secure admin-only surfaces with auditable identities and role-based access.
  - AI lesson generation that respects per-user quotas, logs usage/cost, and produces schema-validated content.
  - Safe upload pipeline to R2 with metadata stored in D1 and shareable yet protected download/streaming links.
  - Operational hygiene: deterministic migrations, seed data, observability, and a documented deployment path (`wrangler deploy`, D1 migrations, R2 buckets).

---

## 2. Issue Snapshot

| Severity | Issue | Impact |
| --- | --- | --- |
| 🟡 Mitigated (2025-11-22) | Auth now verifies HS256 JWTs via `jose`, enforces roles, and records request IDs. Still need richer user management / token issuance. | Compromised tokens are traceable and revocable, but long-term identity service still pending. |
| 🟡 Mitigated (2025-11-22) | Rate limiter now reserves quota before work, counts failures, and enforces token caps; consider future sliding-window/KV if needed. | Abuse is throttled deterministically; remaining work is fine-tuning limits & observability. |
| 🟡 Mitigated (2025-11-22) | Public content endpoints now enforce `isPublished`, signed URLs only resolve for published rows, and admin searches explicitly opt into drafts. | Draft content stays private; admins can still filter unpublished items. |
| 🟡 Mitigated (2025-11-22) | Analytics timestamps are normalized (seconds → ms) before grouping, so usage charts reflect real dates. | Reporting is accurate again; future work is broader observability. |
| 🟡 Mitigated (2025-11-22) | Uploads validate metadata via Zod, enforce MIME/size, create DB rows before R2 writes, and fully clean up on failure. | Upload pipeline is deterministic; orphaned files and junk metadata are far less likely. |
| 🟠 High | CORS fallback always allows first origin. | Cross-site requests effectively unrestricted. |
| 🟡 Mitigated (2025-11-22) | Admin library search now passes `includeUnpublished=true`, so drafts are visible to staff but hidden from public routes. | Editorial workflow unblocked. |
| 🟡 Mitigated (2025-11-22) | Favorite counters now recalc from authoritative user_library rows after each toggle, preventing drift/negatives. | Metrics stay consistent with user actions. |
| 🟡 Mitigated (2025-11-22) | Env limits are now validated via Zod on every request; bad values fail fast with clear errors. | Misconfigurations are caught before runtime, preventing silent limiter failures. |
| 🟡 Medium | Model activation not transactional; invalid IDs leave zero active model. | AI generation falls back unpredictably. |
| 🟡 Medium | Errors logged without request/user context. | Production debugging nearly impossible. |
| 🟢 Mitigated (2025-11-23) | Giant route/service files (>400 LOC) violate modularity guideline. | Content services plus routes now live under `src/domains/content/**` (catalog/media/user services + public/user/admin routers), each ≤ ~210 LOC. |

*(Full rationale came from the earlier deep-dive; this table keeps the main thread visible.)*

---

## 3. Remediation Plan

### 3.1 Blockers – Fix Before Any Production Traffic
1. **Authentication & RBAC** ✅ _Done 2025-11-22 (phase 1)_
   - Replaced shared secret comparison with HS256 JWT verification and role enforcement.
   - Added global request-id middleware + logging so every admin call is traceable.
   - **Still pending:** real user directory/issuance pipeline and periodic secret rotation.
2. **Rate Limiter Rewrite** ✅ _Done 2025-11-22_
   - Requests are now reserved before OpenAI work and counted even on failure.
   - Token consumption is recorded after completion with hard stops when the cap is exceeded.
   - Covered by a dedicated Vitest suite (`pnpm test`). Long-term sliding-window work still on backlog.
3. **Content Publication Guardrails** ✅ _Done 2025-11-22_
   - Public fetch/stream/signed URLs now require published content; admin listing explicitly opts into drafts.
   - Signed URLs are always mediated through `/stream/:id`, preventing direct R2 access to unpublished assets.
4. **Analytics Timestamp Fix** ✅ _Done 2025-11-22_
   - Usage stats now normalize epoch seconds to milliseconds before grouping, so charts and real-time dashboards show the correct day.
   - Still plan to add automated regression tests when the analytics suite is restored.
5. **Upload + Metadata Validation** ✅ _Done 2025-11-22 (phase 1)_
   - Metadata is validated via Zod, uploads enforce MIME/size allowlists, and DB rows are created before R2 writes with rollback/cleanup on failure.
   - **Still pending:** automated sweeper for abandoned R2 objects and richer antivirus/scanning.

### 3.2 High Priority (Sprint Immediately After Blockers)
6. **Strict CORS Enforcement**
   - Reject unknown origins instead of falling back.
7. **Admin Visibility & Favoriting** ✅ _Done 2025-11-22_
   - Admin search now opts into `includeUnpublished`, while public endpoints stay publish-only.
   - Favorite counts recalc from authoritative user_library rows after each toggle, eliminating race conditions.
8. **Environment & Model Safety**
   - Central env schema (`zod` or `envsafe`), reject invalid values at boot.
   - Validate requested model IDs exist before activating/falling back.

### 3.3 Medium / Structural Improvements
9. **Observability**
   - Global middleware to generate/propagate `X-Request-ID`, include userId, route, requestId in logs, and return header.
   - Set up error reporting (Sentry/Workers Trace Events).
10. **Modularity & DDD Prep** ✅ _Done 2025-11-23_
    - Split `services/content.ts` into catalog, media, and user-library services plus shared tagging helpers—each <400 LOC.
    - Moved route handlers into `domains/content/routes/{public,user,admin}.ts`, leaving `routes/content.ts` as a thin composer.
    - Mirrored the domain layout for prompts and AI, aligning directories with the broader ticketing/identity/payments plan.
11. **Testing & CI**
    - Restore Vitest/Miniflare setup; port existing limiter tests; add smoke tests for auth, content search, AI generation.
12. **Docs & Deploy Process**
    - Update README/DEPLOY to include new auth prerequisites, env validation, automated migration script, and monitoring checklist.

### 3.4 Nice-to-Haves (After Stabilization)
13. **Performance Tweaks**
    - Replace tag post-filtering with JOINs, cache hot content, expose pagination metadata.
14. **API Versioning Strategy**
    - Establish `Accept-Version` header or `/v2` plan; document deprecation policy.
15. **Chore Work**
    - Remove stray nested `hanzimaster-backend-playground/` directory copy.
    - Rename migrations to meaningful slugs; add checksums/down scripts.

---

## 4. Backend Execution Plan (Updated)

### Phase A – Remaining Audit Fixes & Observability
1. **Observability Depth**
   - Push structured logs into Workers Analytics / Logpush.
   - Add Workers Metrics or Analytics Engine counters for rate-limit hits, AI success/failure, content actions.
2. **Migration & Schema Hygiene**
   - Normalize migration naming, add down scripts/checksums, document runbooks.
   - Introduce schema versioning hooks and audit fields (`created_by` / `updated_by`) for critical tables.
3. **Test Infrastructure**
   - Restore Vitest/Miniflare harness for all services (auth, content search, uploads, AI flows, analytics).
   - Add integration tests for route-level behaviors (CORS, JWT auth, rate limiting, admin CRUD).

### Phase B – Prompt Template Versioning (Backend Only)
1. **Schema**
   - `prompt_templates` table (slug, type, version, body JSON, metadata, created_by, created_at, is_active).
   - Optional `prompt_template_history` for audit logs.
2. **Services & Routes**
   - Backend service to CRUD/clone/activate templates; persist version info on each AI generation request.
   - Admin API endpoints (`/v1/ai/prompts`) for listing, cloning, activating, and deprecating templates.
3. **AI Service Integration**
   - `AIService` loads the active template per flow/model, caches minimally, and records template id/version in `api_usage` + lesson debug metadata.

### Phase C – Analytics Surfaces
1. **Usage APIs**
   - `/v1/analytics/ai-usage`, `/v1/analytics/content`, `/v1/analytics/system` endpoints returning aggregated stats for the future portal.
   - Include filters (date range, prompt version, model, HSK level) and pagination for large datasets.
2. **Persistent Aggregates**
   - Nightly job or on-demand materialized views for key KPIs to keep API latency low.

### Phase D – Refactor Toward DDD
1. **Module Split**
   - Break `services/content.ts` into domain submodules (catalog, media storage, user library, tagging).
   - Apply the same to routes, aligning with ticketing/identity/payments domains referenced in the audit.
2. **Repository Pattern**
   - Abstract DB access so future portals/tests can mock repositories without touching Drizzle directly.

### Testing Scope (Applies to All Phases)
- **Unit**: Services (content, AI, prompt templates, rate limiting, analytics) plus helper utilities.
- **Integration**: Route tests via Miniflare simulating JWT auth, uploads, streaming, and rate limiting.
- **Regression**: Snapshot tests for migrations/seed data, ensuring prompt template changes don’t break existing flows.
- **Performance/Load**: Target AI generation and content search endpoints to validate quotas and caching.

Deliverables for each phase include updated docs (README/DEPLOY), expanded `BACKEND_PLAYGROUND_AUDIT.md` status, and green CI (tsc, vitest, wrangler dry run).

**Phase A Status (Nov 22, 2025):** System events logging + analytics service are live (`system_events` table + recorder), migration runbook added, and Vitest infrastructure restored (runtime/logger/unit specs). Additional coverage will grow alongside upcoming prompt-versioning work.

**Phase B Progress (Nov 22, 2025):** Prompt template schema/history, admin APIs (create/clone/promote/rollback), and AI integration (including analytics tagging + optional slug/version override) are now shipped. Validation remains manual until the future portal automates approvals.

**Phase C Progress (Nov 22, 2025):** `/v1/analytics/*` endpoints are wired to the event log + usage data, system events capture model/prompt metadata, and migrations (`0008`) track these metrics for future dashboards. Integration tests now exercise prompt APIs (happy path + RBAC) and analytics filters/authorization, ensuring the new surfaces stay stable.

**JWT Hardening (Nov 22, 2025):** Runtime config now requires `JWT_SECRET`/`JWT_MAX_AGE`, auth middleware enforces expiration, and a `pnpm mint:jwt` helper script issues tokens during development.

**Testing Progress (Nov 22, 2025):** Vitest/Miniflare harness restored with 25 passing specs covering runtime config, rate limiter, JWT middleware, prompt templates/services, AI generation (mocked OpenAI), analytics routes, and the full content lifecycle (upload/publish/favorite/progress). Critical happy paths now have automated coverage, paving the way for refactors.

**Phase D Kickoff (Nov 23, 2025):** Content services/routes have been moved into `src/domains/content/**` with separate catalog, media, and user-library services plus a factory (`createContentServices`). Route handlers themselves now live in `domains/content/routes/{public,user,admin}.ts`, leaving `/v1/content` as a thin composer. Prompts and AI have followed suit (`src/domains/prompts/**`, `src/domains/ai/**`), so routes now talk to domain factories instead of monolithic services. All 29 integration/unit specs pass, confirming the refactor preserved behavior.

---

## 4. Rolling Timeline (Rough)

| Week | Focus | Deliverables |
| --- | --- | --- |
| Week 1 | Security hardening | JWT auth, CORS lock-down, request ID middleware |
| Week 2 | Quotas & content safety | Rate limiter rewrite, publish guards, upload validation |
| Week 3 | Observability + admin UX | Contextual logging, admin search fix, favorite counter rewrite |
| Week 4 | Testing & docs | Vitest/Miniflare restored, sanity suites, updated README/DEPLOY |
| Week 5+ | DDD restructure | Break services into per-domain packages, align with wider platform plan |

*(Adjust sequencing as dependencies surface, but blockers must ship before Week 1 closes.)*

---

## 5. Immediate Next Actions

1. Stand up an auth spike (decide on IdP/JWT flow) and schedule secret rotation.
2. Pair on rate limiter design (D1 vs KV) and prototype the reserve-before-work pattern.
3. Draft acceptance criteria for “published content must never leak” and add regression tests.
4. Create GitHub issues for every bullet above, referencing this document for context.

Once these are confirmed, we can iterate, check items off here, and keep stakeholders aligned on readiness.


