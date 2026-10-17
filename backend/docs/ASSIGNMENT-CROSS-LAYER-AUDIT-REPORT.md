# BookLeaf Assignment — Full-Stack Cross-Layer Verification and Gap Audit

**Audit date:** Saturday, Oct 17, 2026  
**Assignment source:** `backend/docs/FULLSTACK-ASSIGNMENT1 (1).docx (1).pdf`  
**Dataset source:** `backend/docs/FULLSTACK-SAMPLEDATA (1) (1).json`  
**Mode:** Read-only inspection — no code, config, or database changes were made  
**Previous report:** `backend/docs/ASSIGNMENT-AUDIT-REPORT.md` used only as secondary context

---

## 1. Executive Summary

| Metric | Count |
|--------|------:|
| **Total requirements reviewed** | **62** |
| **COMPLETE** | **38** |
| **PARTIAL** | **14** |
| **NOT IMPLEMENTED** | **6** |
| **UNVERIFIED** | **3** |
| **BLOCKED** | **1** |

**Overall submission verdict:** The **application code is largely complete and well-connected** across frontend and backend for the core author/admin ticket workflow, AI-assisted admin review, seed data, auth/RBAC, and API documentation. However, **explicit assignment submission deliverables are missing or incomplete**, and one explicit UI requirement (optional attachment control) was replaced with a “not supported” notice.

**Final verdict (Section 11):** **NOT READY — REQUIRED FEATURES REMAIN**

---

## 2. Frontend Status

### Complete (with evidence)

| Area | Evidence |
|------|----------|
| **Routing & RBAC** | `frontend/src/app/router.jsx` — `/author/*` gated by `ProtectedRoute` + `RoleRoute([AUTHOR])`; `/admin/*` gated by `RoleRoute([ADMIN])` |
| **Login** | `LoginPage.jsx` → `authApi.login` → `POST /api/v1/auth/login`; tests in `LoginPage.test.jsx`, `AuthContext.test.jsx` |
| **Author dashboard** | `DashboardPage.jsx` + `useAuthorDashboard.js` — royalty/book summaries from `GET /books`, open tickets via paginated `fetchAllTickets()` |
| **My Books** | `BooksPage.jsx` + `BookList.jsx` — title, ISBN, genre, publication date, status, MRP, copies sold, earned/paid/pending; responsive table/cards |
| **Ticket create** | `CreateTicketPage.jsx` + `CreateTicketForm.jsx` — book dropdown or General/Account Level, subject, description |
| **My Tickets** | `TicketsPage.jsx` + `TicketList.jsx` — Open/In Progress/Resolved/Closed badges, category, priority, pagination |
| **Ticket detail / chat** | `TicketDetailPage.jsx` + `ConversationThread.jsx` + `MessageComposer.jsx`; 5s polling via `useTicketDetail` (`useTickets.js`) |
| **Admin dashboard** | `AdminDashboardPage.jsx` — counts from `pagination.total`, urgent/oldest/recent sections |
| **Admin queue** | `AdminTicketQueuePage.jsx` — URL-synced filters (status, category, priority, dates, search, assignee) |
| **Admin ticket detail** | `AdminTicketDetailPage.jsx` — assignment, status, classification, public reply, internal notes, AI panel |
| **Admin authors** | `AdminAuthorsPage.jsx`, `AdminAuthorDetailPage.jsx` — directory, profile, books, royalty summary, ticket history |
| **AI review UI** | `AiAnalysisPanel.jsx`, `AiDraftEditor.jsx` — edit draft, explicit “Send approved draft as public reply” |
| **Layouts** | `AuthorLayout.jsx`, `AdminLayout.jsx` — fixed `h-screen`, mobile sidebar, top nav |
| **Pagination / empty / error** | `Pagination.jsx`, `EmptyState.jsx`, `ErrorState.jsx` used across list pages |
| **Tests** | **132/132 passing** — `npm test` in frontend (Vitest) |

### Partial

| Area | Gap |
|------|-----|
| **Attachment UI** | Text disclaimer only; no file-picker UI control (`CreateTicketForm.jsx` L206–209) |
| **Author ticket filters** | List supports pagination only; no status/category/search UI (`AUTHOR_API_GAPS.ticketListFilters`) |
| **Dashboard urgency/oldest** | Built from first API page slices + client merge (`useAdminDashboardSections.js`, `dashboardSections.js`) — not global guaranteed |
| **AI status on dashboard** | Omitted by design; footnote on `AdminDashboardPage.jsx` |
| **Admin assignee picker** | Limited to queue-visible admins + self (`assignees.js`) |
| **KB reference display** | IDs/titles only, not policy excerpts (`AiKnowledgeBaseReferences.jsx`) |
| **Author book detail** | Never calls `GET /books/:bookId` |
| **Admin author books filters** | Backend supports `status`/`search`; `AuthorBooksPanel.jsx` paginates only |

### Missing / Unverified

| Area | Status |
|------|--------|
| **Root README** | No `/README.md` at repo root — only `backend/README.md`, `frontend/README.md` |
| **One-page write-up** | No deliverable file found |
| **Live demo URL** | Not documented anywhere in repo |
| **Browser E2E chat** | Not performed in this audit |
| **Registration UI** | Backend `POST /auth/register` exists; no frontend page |

---

## 3. Backend Status

### Complete (with evidence)

| Area | Evidence |
|------|----------|
| **Routes** | 27 API routes under `/api/v1` in `backend/src/routes/index.js` + module routers |
| **Auth** | HttpOnly JWT cookie, CSRF, login rate limit — `auth.routes.js`, `authenticate.js`, `csrf.js` |
| **RBAC** | `authorizeRoles(ROLES.AUTHOR\|ADMIN)` on books, tickets, admin modules |
| **Author isolation** | `ticket.service.js` scopes tickets to `req.user._id`; tested in `tickets.api.test.js` |
| **Books API** | `GET /books`, `GET /books/:bookId` with pagination/filter — `books.api.test.js` |
| **Ticket lifecycle** | Create, list, detail, author messages — `ticket.service.js`, `tickets.api.test.js` |
| **Admin tickets** | Queue, assignment, status, classification — `adminTickets.api.test.js` |
| **Conversation** | Public replies + internal notes — `adminTicketConversation.api.test.js` |
| **AI pipeline** | 6 categories, 4 priorities, OpenAI/Ollama providers, KB retrieval, failure handling — `aiAnalysis.service.js`, `aiTickets.test.js` |
| **Seed** | Idempotent import of assignment JSON — `seed.service.js`, `seed.test.js` (10 authors, 18 books verified) |
| **OpenAPI/Swagger** | `docs/api/openapi.yaml`, served at `/api-docs` — `openapi.test.js` |
| **Validation/errors** | Joi via `validate.js`, `ApiError`/`errorHandler.js` |
| **Models** | User, Book, Ticket, TicketMessage, InternalNote, AuditLog, Counter — unit tests |
| **Sensitive field exclusion** | `toPublicTicket()` strips AI fields; admin author responses exclude `passwordHash` |

### Partial

| Area | Gap |
|------|-----|
| **Author ticket query filters** | Only `page`/`limit` in `listTicketsQuerySchema` |
| **AI queue filter** | `aiProcessingStatus` stored on Ticket but not filterable in admin queue API |
| **AI re-analysis on follow-ups** | `queueTicketAnalysis()` only on ticket create, not on new messages |
| **Cost strategy docs** | KB keyword selection limits context (`knowledgeBase.service.js`); no explicit token-budget doc |
| **Model choice rationale** | `gpt-4o-mini` example in README; no dedicated architecture write-up |

### Missing / Issues

| Area | Status |
|------|--------|
| **Attachment upload** | Not required by PDF (UI only); correctly absent |
| **Author activity timeline API** | Not implemented (`ADMIN_API_GAPS`) |
| **Royalty transaction history** | Aggregate summary only |
| **Git repository** | Workspace is **not a git repo** (`fatal: not a git repository`) |
| **Test flake** | 1 backend test timed out: `adminAuthors.api.test.js` “returns a paginated author directory” |

---

## 4. Frontend–Backend Integration Matrix

| Req ID | Requirement | Frontend | Backend | Integration | Tests | Gap |
|--------|-------------|----------|---------|-------------|-------|-----|
| AUTH-01 | Email/password login | COMPLETE — `LoginPage`, `authApi.login` | COMPLETE — `POST /auth/login` | COMPLETE — CSRF + cookie | `auth.api.test.js`, `LoginPage.test.jsx` | — |
| AUTH-02 | Author sees only own data | COMPLETE — role routes | COMPLETE — author-scoped queries | COMPLETE | `books.api.test.js`, `tickets.api.test.js` | — |
| AUTH-03 | Admin login & protection | COMPLETE — `RoleRoute([ADMIN])` | COMPLETE — admin router middleware | COMPLETE | `AdminRoute.test.jsx`, admin API 403 tests | — |
| BOOK-01 | My Books required fields | COMPLETE — `BookList.jsx` | COMPLETE — `book.service.js` | COMPLETE — `GET /books` | `BooksPage.test.jsx`, `books.api.test.js` | — |
| BOOK-02 | Published + in-production | COMPLETE — status labels | COMPLETE — dataset statuses | COMPLETE | `seed.test.js`, `BookList.jsx` | — |
| BOOK-03 | Royalty earned/paid/pending | COMPLETE — dashboard + book list | COMPLETE — Book model fields | COMPLETE | `seed.test.js`, `computeBookSummary` tests | — |
| BOOK-04 | Book pagination/search/filter | COMPLETE — `BooksPage` | COMPLETE — query params | COMPLETE | `books.api.test.js` | — |
| TKT-A-01 | Ticket: book or General | COMPLETE — `CreateTicketForm` | COMPLETE — `categoryContext`/`bookId` | COMPLETE | `CreateTicketForm.test.jsx`, `tickets.api.test.js` | — |
| TKT-A-02 | Subject + description | COMPLETE | COMPLETE — Joi validation | COMPLETE | Both sides tested | — |
| TKT-A-03 | Optional attachment UI (UI only) | **NOT IMPLEMENTED** — disclaimer text only | N/A (upload bonus not required) | **PARTIAL** — requirement is UI presence | No attachment test | Assignment asks for UI control; app explicitly rejects |
| TKT-A-04 | My Tickets + statuses | COMPLETE — `TicketList` | COMPLETE — ticket statuses enum | COMPLETE | `TicketsPage.test.jsx` | — |
| TKT-A-05 | Original query + admin replies | COMPLETE — `ConversationThread` | COMPLETE — messages in detail | COMPLETE | `TicketDetailPage.test.jsx`, conversation API tests | — |
| TKT-A-06 | Near-real-time updates | COMPLETE — 5s polling | COMPLETE — persisted messages | COMPLETE | Polling test in `TicketDetailPage.test.jsx` | Polling, not WebSocket |
| TKT-A-07 | Responsive sidebar/navbar | COMPLETE — layouts | N/A | COMPLETE | `AuthorLayout.test.jsx`, `AdminLayout.test.jsx` | — |
| TKT-A-08 | Pagination on lists | COMPLETE | COMPLETE — `pagination.total` | COMPLETE | `Pagination.test.jsx` | — |
| TKT-A-09 | Empty/error states | COMPLETE | COMPLETE — meaningful API errors | COMPLETE | Page tests | — |
| ADM-01 | Dashboard metrics | COMPLETE — count queries | COMPLETE — queue pagination totals | COMPLETE | `AdminDashboardPage.test.jsx` | N+1 count queries, no aggregate endpoint |
| ADM-02 | Ticket queue filters | COMPLETE — `TicketQueueFilters` | COMPLETE — `buildAdminTicketFilter` | COMPLETE | `adminTickets.api.test.js`, queue page test | — |
| ADM-03 | Urgent + oldest visibility | PARTIAL — page-slice + client sort | COMPLETE — filterable queue | PARTIAL | `dashboardSections.test.js` | May miss tickets outside fetched pages |
| ADM-04 | AI auto-classification (6 cats) | COMPLETE — comparison UI | COMPLETE — `TICKET_CATEGORIES` | COMPLETE | `aiTickets.test.js`, AI component tests | Live AI quality UNVERIFIED (mocked in CI) |
| ADM-05 | AI priority (Critical/High/Med/Low) | COMPLETE | COMPLETE — `TICKET_PRIORITIES` | COMPLETE | AI tests | Display uses enum codes, not labels |
| ADM-06 | Admin override category | COMPLETE — `ClassificationControl` | COMPLETE — `PATCH .../classification` | COMPLETE | `adminTickets.api.test.js` | — |
| ADM-07 | Admin override priority | COMPLETE | COMPLETE | COMPLETE | Same | — |
| ADM-08 | KB-grounded AI draft | COMPLETE — references panel | COMPLETE — `getRelevantKnowledgeBase` | COMPLETE | `aiTickets.test.js` | UI shows IDs not full excerpts |
| ADM-09 | Editable draft before send | COMPLETE — `AiDraftEditor` | COMPLETE — `aiDraftResponse` field | COMPLETE | `AiAnalysisPanel.test.jsx` | — |
| ADM-10 | Sent reply visible to author | COMPLETE — polling detail | COMPLETE — public `TicketMessage` | COMPLETE | Conversation API + author detail test | No cross-browser E2E |
| ADM-11 | Status updates | COMPLETE — `StatusControl` | COMPLETE — transitions + audit | COMPLETE | Admin ticket tests | — |
| ADM-12 | Private internal notes | COMPLETE — `InternalNotesPanel` | COMPLETE — separate model/routes | COMPLETE | `adminTicketConversation.api.test.js` L332+ | — |
| ADM-13 | Assign to self | COMPLETE — `AssignmentControl` | COMPLETE — `PATCH .../assignment` | COMPLETE | Admin ticket tests | Assignee list incomplete |
| ADM-14 | All Authors directory | COMPLETE — `AdminAuthorsPage` | COMPLETE — `GET /admin/authors` | COMPLETE | `AdminAuthorsPage.test.jsx`, `adminAuthors.api.test.js` | Backend test timeout flake |
| ADM-15 | Author details + books + royalty + tickets | COMPLETE — `AdminAuthorDetailPage` | COMPLETE — author detail/books/royalty + queue `authorId` | COMPLETE | `AdminAuthorDetailPage.test.jsx` | Activity timeline missing |
| ADM-16 | Responsive admin layout | COMPLETE | N/A | COMPLETE | Layout tests | — |
| ADM-17 | Pagination + global counts | COMPLETE — uses `pagination.total` | COMPLETE | COMPLETE | Integration tests | Dashboard sections use partial fetches |
| ADM-18 | AI analysis status visibility | PARTIAL — detail page only | COMPLETE — `aiProcessingStatus` on detail | PARTIAL | AI panel tests | No dashboard AI queue; queue list omits status |
| API-01 | REST structure | COMPLETE — service modules | COMPLETE — `/api/v1` modules | COMPLETE | OpenAPI test | — |
| API-02 | Auth middleware | COMPLETE — credentialed axios | COMPLETE — `authenticate` | COMPLETE | Auth tests | — |
| API-03 | RBAC | COMPLETE | COMPLETE | COMPLETE | 401/403 tests | — |
| API-04 | Validation + errors | COMPLETE — client validation | COMPLETE — Joi + `ApiError` | COMPLETE | Validation tests both sides | — |
| API-05 | API documentation | COMPLETE — README links | COMPLETE — Swagger + OpenAPI | COMPLETE | `openapi.test.js` | No Postman collection |
| AI-01 | Six categories | COMPLETE — constants aligned | COMPLETE — `ticketCategory.js` | COMPLETE | `aiOutput.schema.test.js` | — |
| AI-02 | Four priorities | COMPLETE | COMPLETE | COMPLETE | Same | — |
| AI-03 | Auto classify on create | N/A author view | COMPLETE — `queueTicketAnalysis` | COMPLETE | `aiTickets.test.js` | — |
| AI-04 | Auto prioritize | Admin UI | COMPLETE | COMPLETE | AI tests | — |
| AI-05 | KB in prompts | Reference UI | COMPLETE — 6 markdown policies | COMPLETE | Unit tests | — |
| AI-06 | BookLeaf tone in prompts | N/A | COMPLETE — `aiPrompts.js` + tone KB doc | COMPLETE | Static inspection | Live output quality UNVERIFIED |
| AI-07 | Explicit admin approval | COMPLETE — approve button | COMPLETE — draft ≠ auto-send | COMPLETE | `AiAnalysisPanel.test.jsx` | — |
| AI-08 | API keys server-side only | COMPLETE — no secrets in frontend `.env.example` | COMPLETE — `aiConfig.js` | COMPLETE | Static inspection | — |
| AI-09 | Graceful AI degradation | COMPLETE — manual reply UI | COMPLETE — FAILED/SKIPPED status | COMPLETE | `aiTickets.test.js` | — |
| AI-10 | Ticket creation without AI | COMPLETE | COMPLETE | COMPLETE | AI skip tests | — |
| AI-11 | Manual reply fallback | COMPLETE — composers | COMPLETE — admin/author message endpoints | COMPLETE | Conversation tests | — |
| AI-12 | Cost-conscious token use | N/A | PARTIAL — KB keyword selection (max ~4+tone) | PARTIAL | Static only | Full conversation still sent each call |
| AI-13 | Model choice documented | N/A | PARTIAL — README examples | PARTIAL | — | No brief justification doc |
| AI-14 | AI retry/regenerate | COMPLETE — regenerate button | COMPLETE — `POST .../ai/draft` | COMPLETE | `aiTickets.test.js` | No re-run on new author messages |
| DATA-01 | Seed exact dataset | N/A | COMPLETE — `seed.test.js` imports full JSON | COMPLETE | Automated seed test | Tickets not pre-seeded (runtime only) |
| DATA-02 | Seed idempotency | N/A | COMPLETE | COMPLETE | `seed.test.js` | — |
| DATA-03 | Null/zero royalty handling | COMPLETE — `formatINR` | COMPLETE — nullable fields | COMPLETE | Seed + model tests | — |
| DATA-04 | In-production book edge cases | COMPLETE — status filters | COMPLETE — nullable ISBN/dates | COMPLETE | `books.api.test.js`, seed test | — |
| CHAT-01 | Full author↔admin conversation | COMPLETE — components + hooks | COMPLETE — message endpoints | COMPLETE — API tests | Component tests only | **No browser E2E verification** |
| SUB-01 | Public GitHub/GitLab repo | N/A | N/A | **NOT IMPLEMENTED** | — | No `.git` directory |
| SUB-02 | Live demo URL | N/A | N/A | **NOT IMPLEMENTED** | — | UNVERIFIED |
| SUB-03 | Demo pre-seeded with dataset | N/A | COMPLETE locally — seed script | UNVERIFIED for deployment | `seed.test.js` | No deployed instance to verify |
| SUB-04 | Evaluator credentials in README | PARTIAL — backend README only | COMPLETE — seed docs | PARTIAL | — | No root README; demo creds local-only |
| SUB-05 | Root README (setup, arch, AI, limits) | PARTIAL — split READMEs | PARTIAL — backend README strong | PARTIAL | — | Missing unified root doc |
| SUB-06 | One-page approach write-up | **NOT IMPLEMENTED** | N/A | **NOT IMPLEMENTED** | — | File not found |
| TECH-01 | Modern frontend (React) | COMPLETE — React 19 + Vite | N/A | COMPLETE | — | — |
| TECH-02 | Backend (Node/Express) | N/A | COMPLETE | COMPLETE | — | — |
| TECH-03 | Database | N/A | COMPLETE — MongoDB/Mongoose | COMPLETE | Model + integration tests | — |
| TECH-04 | Real-time mechanism | COMPLETE — polling | N/A | COMPLETE | Polling unit test | — |
| TECH-05 | Deployed accessible URL | N/A | N/A | **NOT IMPLEMENTED** | — | UNVERIFIED |

---

## 5. Chat/Conversation Verdict

**Verdict: Implemented but not fully verified**

### Evidence supporting implementation

| Step | Frontend | Backend | Persistence |
|------|----------|---------|-------------|
| 1. Author creates ticket | `CreateTicketForm` → `useCreateTicket` → `POST /tickets` | `createAuthorTicket()` | `Ticket` + initial `TicketMessage` |
| 2. Appears in admin queue | `AdminTicketQueuePage` → `GET /admin/tickets` | `getAdminTicketQueue()` | MongoDB query |
| 3. Admin opens ticket | `AdminTicketDetailPage` → `GET /admin/tickets/:id` | Admin detail service | — |
| 4. Admin public reply | `AdminReplyComposer` → `POST .../messages` | `sendAdminTicketReply()` | `TicketMessage` role ADMIN |
| 5. Reply persisted | — | 201 + DB write | `adminTicketConversation.api.test.js` |
| 6. Author sees reply | `useTicketDetail` polling → `GET /tickets/:id` | `toPublicTicket({ includeMessages: true })` | — |
| 7. Author follow-up | `MessageComposer` → `POST .../messages` | `addAuthorTicketMessage()` | Author message |
| 8. Admin sees follow-up | `useAdminTicketMessages` | `GET .../messages` | Paginated messages |
| 9. Ordering/labels | `ConversationThread` — `senderRole`, `senderName`, `createdAt` | Same schema | — |
| 10. Refresh without reload | 5s polling (`TICKET_POLL_INTERVAL_MS`) | — | `TicketDetailPage.test.jsx` |
| 11. Polling stops on leave | `refetchInterval` tied to mounted query; unmount test passes | — | `TicketDetailPage.test.jsx` L134–156 |
| 12. Failed sends handled | Error display in composers; mutations `retry: false` | API errors returned | Component tests |
| 13. Retry no duplicates | Mutations disabled while submitting (`isSubmitting`) | No idempotency key | **UNVERIFIED** under double-click race |
| 14. Private notes invisible | Separate `InternalNotesPanel`; author uses public ticket endpoint only | Notes on `/admin/.../notes` only | `adminTicketConversation.api.test.js` L332+ |
| 15. Server-side enforcement | — | 403 for author on admin routes; author ticket scoped by user id | Integration tests |

### Verification classification

| Evidence type | Coverage |
|---------------|----------|
| Static code inspection | Full path traced |
| Automated API integration tests | Strong (`tickets.api.test.js`, `adminTicketConversation.api.test.js`) |
| Automated frontend component tests | Partial (`TicketDetailPage.test.jsx` — mocked API, polling, closed ticket, AI hidden) |
| Browser/manual E2E | **Not performed** |
| External service | N/A |

---

## 6. AI Readiness

### Implemented

- **Six categories** and **four priorities** match assignment enums (`ticketCategory.js`, `ticketPriority.js`)
- **Automatic analysis on ticket create** via async `queueTicketAnalysis()` → `analyzeTicketById()`
- **OpenAI and Ollama** providers with factory pattern; disabled when `AI_PROVIDER` unset
- **Knowledge base:** 6 markdown policies with keyword relevance scoring (`knowledgeBase.service.js`)
- **Prompt structure:** system + user prompt with ticket, conversation, book context, KB (`aiPrompts.js`)
- **Structured output validation:** `aiOutput.schema.js`
- **Admin overrides** preserved separately from `aiCategory`/`aiPriority`
- **Editable draft + explicit approval** before public send (`AiAnalysisPanel.handleApprove` → `useSendAdminPublicReply`)
- **Manual regenerate:** `POST /admin/tickets/:id/ai/draft`
- **Failure handling:** `aiProcessingStatus` FAILED/SKIPPED; tickets and manual replies still work (`aiTickets.test.js`)
- **Security:** keys in backend env only; AI fields stripped from author responses (`toPublicTicket`)

### Remaining gaps

| Gap | Priority | Detail |
|-----|----------|--------|
| Live LLM output quality | P2 | All CI tests mock providers; no paid API calls in audit |
| AI stale after follow-ups | P2 | New messages do not re-queue analysis |
| Dashboard AI queue filter | P3 | `aiProcessingStatus` not filterable in queue API; dashboard sections omitted |
| Token/cost documentation | P2 | KB selection is smart; full conversation still included each call |
| Model choice write-up | P1 | Required in submission README/write-up — only examples in backend README |
| Prompt injection handling | P3 | No explicit sanitization beyond schema validation |

---

## 7. Security and Data Integrity

### Confirmed strengths

- HttpOnly JWT cookie auth; token not in JSON responses
- CSRF on login/logout/register
- Login rate limiting (`loginRateLimiter.js`)
- Role-based route protection on all sensitive endpoints
- Author ticket/book ownership enforced in services
- Internal notes on separate admin-only routes; verified invisible to authors in tests
- `passwordHash`, `tokenVersion`, AI draft/error excluded from public/author API shapes
- Seed script blocks demo passwords in production; requires `SEED_CONFIRM`
- Audit log rollback on failed admin mutations (`auditHelper.js` — tested)

### Problems / unverified areas

| Issue | Severity | Evidence |
|-------|----------|----------|
| No git repo | P1 submission | `git status` fails — cannot verify remote cleanliness or history |
| `GET /auth/test/admin-only` exposed in all envs | P3 | `auth.routes.js` — not gated like `/demo` |
| Double-submit duplicate messages | P3 | No idempotency keys; UI disables button but race UNVERIFIED |
| Prompt injection / unsafe content | P3 | Not explicitly handled |
| Production deployment security | UNVERIFIED | No live URL to inspect headers, CORS, cookie settings |
| `.env` present locally | Info | Exists but not audited for committed secrets (git absent) |

---

## 8. Tests and Verification

### Commands run

```bash
cd backend && npm test          # Jest, in-memory MongoDB
cd frontend && npm test         # Vitest + jsdom
```

### Results

| Suite | Result | Detail |
|-------|--------|--------|
| **Backend** | **192 pass, 1 fail** | `adminAuthors.api.test.js` — “returns a paginated author directory for admins” **timeout at 5000ms** (likely flake; other directory tests passed) |
| **Frontend** | **132/132 pass** | 35 test files |
| **OpenAPI validation** | Pass (via `openapi.test.js`) | Included in backend suite |
| **Paid AI providers** | Not called | Mocked per project design |
| **Browser E2E** | Not run | No Playwright/Cypress in project |
| **Live API against running dev server** | Not run | No live HTTP audit performed |

### Verification evidence by category

| Category | Used for |
|----------|----------|
| Static code inspection | Primary for cross-layer tracing |
| Automated unit/integration tests | Backend API, models, AI mocks, frontend components |
| API verification | Via supertest integration tests only |
| Browser/manual | **Not available** |
| External service | **Blocked/skipped** (AI, deployment) |

---

## 9. Missing and Incomplete Requirements

### Explicit assignment requirements still incomplete

1. **Optional file attachment UI control** (UI only — upload not required) — replaced with “not supported” text
2. **Public GitHub/GitLab repository** — no git repository initialized
3. **Live deployed demo URL** — not documented
4. **Root README** covering full project setup, architecture, AI strategy, limitations
5. **One-page approach write-up** — not found
6. **Unified submission packaging** — backend/frontend READMEs exist separately but submission asks for cohesive docs

### Functional gaps (non-blocker but assignment-relevant)

7. Author ticket list filtering (status/category/search)
8. Admin dashboard global “oldest unresolved” accuracy (page-slice limitation)
9. Admin dashboard AI processing queue visibility
10. AI re-analysis when conversation grows
11. Author activity timeline (documented gap)
12. Royalty transaction history (documented gap)
13. Browser-level E2E verification of chat flow

---

## 10. Prioritized Fix List

### P0 — Critical security / data integrity / core workflow

| ID | Task | Layers | Files | Acceptance criteria | Verify |
|----|------|--------|-------|---------------------|--------|
| P0-1 | Initialize git repo; ensure no secrets committed | Repo | `.gitignore`, `.env` | Clean public repo; `.env` excluded | `git status`, secret scan |
| P0-2 | Confirm private notes never leak via author endpoints | Backend | `ticket.service.js`, admin conversation routes | Author GET ticket/messages never returns notes | Existing + manual API call |

*(No P0 functional workflow breaks found in code inspection.)*

### P1 — Required assignment features / submission blockers

| ID | Task | Layers | Files | Acceptance criteria | Verify |
|----|------|--------|-------|---------------------|--------|
| P1-1 | Add attachment UI control (disabled/mock file input OK per PDF) | Frontend | `CreateTicketForm.jsx` | Visible optional attachment field; no upload required | Component test + manual |
| P1-2 | Create root `README.md` | Docs | `/README.md` | Setup, architecture, AI strategy, API link, limitations, creds | Review |
| P1-3 | Deploy live demo; document URL + test logins | Ops/Docs | README | Both portals accessible; dataset seeded | Manual browser |
| P1-4 | Write one-page approach document | Docs | e.g. `APPROACH.md` | Priorities, trade-offs, production evolution | Review |
| P1-5 | Push to public GitHub/GitLab | Repo | — | Remote accessible to evaluators | `gh repo view` |
| P1-6 | Fix flaky admin authors pagination test | Backend | `adminAuthors.api.test.js` | Full suite green | `npm test` |
| P1-7 | Document AI model choice and cost strategy | Docs | root README | Justify gpt-4o-mini/Ollama; explain KB selection | Review |

### P2 — Important quality / integration / UX

| ID | Task | Layers | Acceptance | Verify |
|----|------|--------|------------|--------|
| P2-1 | Author ticket list filters | BE+FE | `GET /tickets?status=&search=` + UI filters | API + UI tests |
| P2-2 | Admin dashboard oldest/urgent accuracy | BE or FE | Dedicated query or server sort across full queue | Dashboard manual |
| P2-3 | `aiProcessingStatus` queue filter | BE+FE | Filter + optional dashboard section | Integration test |
| P2-4 | Re-run AI on significant conversation updates | Backend | Optional re-queue on author message | Unit test |
| P2-5 | Browser E2E chat smoke test | Test | Author create → admin reply → author sees | Playwright |
| P2-6 | Wire `ApiCapabilityNotice` / `ADMIN_API_GAPS` consistently | Frontend | Single source for documented gaps | Inspection |
| P2-7 | Admin author books search/status on detail page | Frontend | Uses existing backend params | UI test |

### P3 — Polish

| ID | Task | Detail |
|----|------|--------|
| P3-1 | Gate `/auth/test/admin-only` to non-production | Match `/demo` pattern |
| P3-2 | Message send idempotency | Prevent duplicate on double-click |
| P3-3 | Show KB excerpt snippets in AI panel | Better admin review UX |
| P3-4 | Author message pagination | Long thread scalability |
| P3-5 | Admin directory for assignees | Replace queue-derived list |

---

## 11. Final Verdict

### **NOT READY — REQUIRED FEATURES REMAIN**

**Justification:**

The **core product** — dual portals, REST API, auth/RBAC, book catalogue, ticket lifecycle, admin queue/management, AI-assisted draft workflow with manual approval, knowledge-base integration, seed data, Swagger docs, and strong automated test coverage — is **substantially complete and cross-layer connected**. Backend integration tests explicitly verify author/admin message isolation, status transitions, classification overrides, and AI failure degradation.

However, the assignment PDF requires **five submission deliverables**, and **multiple are missing**:

| Deliverable | Status |
|-------------|--------|
| Public Git repository | **NOT IMPLEMENTED** — workspace is not a git repo |
| Live demo URL | **NOT IMPLEMENTED / UNVERIFIED** |
| README (project-wide) | **PARTIAL** — backend + frontend READMEs only |
| One-page write-up | **NOT IMPLEMENTED** |
| Pre-seeded deployed demo | **UNVERIFIED** |

Additionally, the PDF explicitly requires an **optional attachment UI control** (upload not required); the implementation shows a **“not supported” disclaimer** instead (`CreateTicketForm.jsx` L206–209), which is a direct requirement gap.

**Chat** is architecturally complete with polling-based near-real-time updates and strong API test evidence, but **lacks browser E2E verification**.

**Recommendation:** Address P1 submission blockers (git, deploy, root README, write-up, attachment UI) before submission. Core application work appears ready for minor fixes rather than major reimplementation.

---

## Cross-Layer Mismatch Summary

| Mismatch | Expected | Actual | Impact | Files |
|----------|----------|--------|--------|-------|
| Attachment UI | Optional file input (UI only) | “Not supported” text | Assignment requirement gap | `CreateTicketForm.jsx` |
| Author ticket filters | Filterable ticket list | Pagination only | UX limitation | `ticketsApi.js`, `TicketsPage.jsx`, `AUTHOR_API_GAPS` |
| Admin AI queue filter | Filter by AI status | Not in queue API | Dashboard AI sections omitted | `adminTicket.validation.js`, `AdminDashboardPage.jsx` |
| `GET /books/:bookId` | Optional detail view | Backend only | Unused endpoint | `book.routes.js` |
| Admin author book filters | Search/status on detail | Pagination only | Underused backend capability | `AuthorBooksPanel.jsx` |
| Dashboard oldest tickets | Global oldest unresolved | Client sort on page slice | May miss tickets | `dashboardSections.js` |
| AI on follow-ups | Fresh draft after new messages | AI only on create | Stale drafts possible | `ticket.service.js`, `aiAnalysis.service.js` |
| `initialMessage` on create | Show in thread immediately | Success screen shows ticket number only | Minor UX gap | `CreateTicketForm.jsx` |
| Git / demo / write-up | Submission deliverables | Missing | Submission blocked | Repo root |

---

*Audit performed read-only. No files were modified, no dependencies installed, no databases seeded, and no paid AI APIs were called.*
