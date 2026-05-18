# Roadmap to Production

> **Current status:** MVP functional — Gantt + Kanban + AI chat + Excel + Docker + K8s manifests
> **Target:** Production-ready multi-user SaaS with PostgreSQL, OAuth2, observability

---

## What Exists Today

| Feature | Status | Notes |
|---------|--------|-------|
| D3 Gantt Chart | ✅ Done | Drag, zoom, dependencies, context menu |
| Kanban Board | ✅ Done | @dnd-kit, assignee grouping |
| AI Chat (SSE) | ✅ Done | OpenAI-compatible, streaming |
| Command Engine | ✅ Done | Bag-of-Words parser, instant commands |
| Excel Import/Export | ✅ Done | Merge/overwrite modes |
| iCal Export | ✅ Done | Calendar event export |
| JWT Auth | ✅ Basic | Single admin user, SHA-256 hash, 24h expiry |
| Rate Limiting | ✅ Done | In-memory, 30 req/min |
| Docker Compose | ✅ Done | Backend + Frontend services |
| K8s Manifests | ✅ Done | Deployments, HPA, PDB, Ingress, ConfigMap, Secret |
| MCP Server | ✅ Done | Tool-calling agent support |
| i18n | ✅ Done | Russian localization |
| Seed Data | ✅ Done | 12-task demo project |
| Settings Modal | ✅ Done | Runtime LLM config |
| Unit Tests | ✅ Partial | Pytest (backend), Vitest (frontend) |
| Storage | ⚠️ JSON file | In-memory + disk, no concurrency safety |
| WebSocket | ⚠️ Echo only | No real broadcast/sync |
| Logging | ❌ Missing | No structured logs |
| Monitoring | ❌ Missing | No metrics/alerts |
| CI/CD | ❌ Missing | Manual deploy only |
| E2E Tests | ❌ Missing | No Playwright/Cypress |

---

## Technical Debts

| Area | Current | Target | Risk |
|------|---------|--------|------|
| **Storage** | In-memory dict + JSON file | PostgreSQL + SQLAlchemy + Alembic | Data corruption on concurrent writes |
| **Auth** | Single admin, basic JWT | Keycloak/OAuth2, RBAC, token refresh | No multi-tenant, no session revocation |
| **Date Validation** | Format check only (YYYY-MM-DD) | Range validation: `end_date >= start_date` | Invalid Gantt rendering |
| **CORS** | Defaults to `*` | Explicit origin whitelist | Open to any origin |
| **WebSocket** | Echo handler | Real-time plan sync via broadcast | Stale data in multi-user mode |
| **Logging** | None | Structured JSON logs + correlation IDs | Blind to production issues |
| **Error Boundaries** | None | React error boundaries + fallback UI | White screen on JS error |
| **Pagination** | None | Cursor-based on `GET /api/tasks/` | Slow responses with 500+ tasks |
| **Secrets** | Env vars only | Docker secrets / K8s secrets | Key exposure in env inspection |

---

## Implementation Phases

### Phase 1 — Data Integrity (1-2 weeks) 🔴 MUST HAVE

Foundation: persistent storage, validation, crash resilience.

| # | Item | Effort | Dependencies | Deliverable |
|---|------|--------|--------------|-------------|
| 1.1 | **PostgreSQL + SQLAlchemy** | 3-4 days | — | Models, engine, session factory, replace `PlanState` with DB queries |
| 1.2 | **Alembic Migrations** | 1 day | 1.1 | `alembic/` with initial migration, CLI integration |
| 1.3 | **Date Range Validation** | 0.5 day | 1.1 | `end_date >= start_date` in Pydantic validator + API error |
| 1.4 | **React Error Boundaries** | 0.5 day | — | `ErrorBoundary` wrapper, fallback UI, toast notification |
| 1.5 | **Connection Pooling** | 0.5 day | 1.1 | `asyncpg` + `SQLAlchemy async engine` with pool config |
| 1.6 | **Transaction Safety** | 1 day | 1.1 | All mutations in DB transactions, rollback on error |

**Acceptance criteria:**
- [ ] `docker compose up` starts with PostgreSQL container
- [ ] All CRUD operations use DB, not JSON
- [ ] Invalid date range returns 422 with clear error
- [ ] JS error in any component shows fallback, not white screen

---

### Phase 2 — Multi-User Security (1-2 weeks) 🔴 MUST HAVE

Production auth, role-based access, hardened configuration.

| # | Item | Effort | Dependencies | Deliverable |
|---|------|--------|--------------|-------------|
| 2.1 | **Keycloak Docker Setup** | 2 days | — | Keycloak container, realm, clients, roles |
| 2.2 | **OAuth2 Integration** | 2 days | 2.1 | Backend validates Keycloak tokens, replaces basic JWT |
| 2.3 | **RBAC** | 1 day | 2.2 | Roles: admin, editor, viewer — endpoint guards |
| 2.4 | **Token Refresh** | 0.5 day | 2.2 | Refresh token flow, silent re-auth in frontend |
| 2.5 | **CORS Hardening** | 0.5 day | — | Default `CORS_ORIGINS=""`, configurable via env |
| 2.6 | **K8s Secrets** | 0.5 day | — | Move `JWT_SECRET`, `OPENAI_API_KEY` to K8s Secret |

**Acceptance criteria:**
- [ ] Login via Keycloak OIDC flow
- [ ] Viewer role cannot create/edit/delete tasks
- [ ] Token auto-refreshes before expiry
- [ ] CORS rejects unknown origins

---

### Phase 3 — Observability (1-2 weeks) 🟡 SHOULD HAVE

Know what's happening in production.

| # | Item | Effort | Dependencies | Deliverable |
|---|------|--------|--------------|-------------|
| 3.1 | **Structured Logging** | 1-2 days | — | JSON logs, correlation IDs (`X-Request-ID`), log levels |
| 3.2 | **Request/Response Logging** | 0.5 day | 3.1 | Middleware logs method, path, status, duration |
| 3.3 | **Prometheus Metrics** | 1 day | — | `/metrics` endpoint: req/sec, latency, error rate |
| 3.4 | **Grafana Dashboard** | 1 day | 3.3 | Pre-built dashboard in `docker-compose.yml` |
| 3.5 | **Frontend Error Tracking** | 0.5 day | — | `window.onerror` handler, report to backend |

**Acceptance criteria:**
- [ ] Every log line is valid JSON with `correlation_id`
- [ ] Prometheus scrapes `/metrics` every 15s
- [ ] Grafana shows latency p50/p95, error rate, task count

---

### Phase 4 — Quality & Scale (1-2 weeks) 🟡 SHOULD HAVE

Automated testing, real-time sync, scalable endpoints.

| # | Item | Effort | Dependencies | Deliverable |
|---|------|--------|--------------|-------------|
| 4.1 | **CI/CD Pipeline** | 2-3 days | — | GitHub Actions: lint → test → build → deploy |
| 4.2 | **E2E Tests (Playwright)** | 3-4 days | 4.1 | Login → upload → edit → export flows |
| 4.3 | **WebSocket Real-time** | 1-2 days | 1.1 | Broadcast plan mutations to connected clients |
| 4.4 | **Cursor-based Pagination** | 1 day | 1.1 | `GET /api/tasks/?cursor=&limit=50` |
| 4.5 | **ESLint + Prettier** | 0.5 day | — | Frontend code quality gates in CI |

**Acceptance criteria:**
- [ ] PR blocked if tests fail or lint errors
- [ ] Playwright runs in CI, results as artifact
- [ ] Two browser tabs see changes in < 500ms
- [ ] 1000 tasks loads in < 1s with pagination

---

### Phase 5 — Polish (1 week) 🟢 NICE TO HAVE

Auditing, recovery, developer experience.

| # | Item | Effort | Dependencies | Deliverable |
|---|------|--------|--------------|-------------|
| 5.1 | **Audit Log** | 2 days | 1.1 | Track mutations: who, what, when, old→new |
| 5.2 | **DB Backup Strategy** | 1 day | 1.1 | Automated pg_dump, configurable schedule |
| 5.3 | **LLM Dry-run** | 2 days | — | Preview AI changes before applying |
| 5.4 | **Secret Management** | 1 day | — | Docker secrets for local, K8s secrets for prod |
| 5.5 | **OpenAPI Docs** | 0.5 day | — | Auto-generated `/docs` from FastAPI (already exists, polish) |

**Acceptance criteria:**
- [ ] Audit entries queryable via API
- [ ] Backup restores to new DB instance
- [ ] LLM changes shown as diff before confirm

---

## Priority Summary

```
 Phase 1 — Data Integrity     ████████████  6 items   1-2 weeks  🔴
 Phase 2 — Multi-User Security ███████████   6 items   1-2 weeks  🔴
 Phase 3 — Observability      █████████     5 items   1-2 weeks  🟡
 Phase 4 — Quality & Scale    ██████████    5 items   1-2 weeks  🟡
 Phase 5 — Polish             ███████       5 items   1 week     🟢
```

**Total: 5-8 weeks** for production-ready deployment

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Data corruption — JSON race conditions | High | Critical | Phase 1.1 (PostgreSQL) is first priority |
| LLM hallucination — AI modifies plan incorrectly | High | High | Dry-run preview (5.3) + user confirmation |
| D3 performance — 1000+ tasks lag | Medium | Medium | Pagination (4.4) + virtual rendering |
| OpenAI API downtime | Medium | High | Command engine works offline, retry logic |
| Token theft — JWT without HTTPS | Medium | Critical | Enforce TLS in production, K8s ingress TLS |
| Concurrent edits — two users modify same task | Low | Medium | Optimistic locking via DB version column |

---

## Quick Wins (< 2 days each, parallelizable)

- [ ] Date range validation in `TaskBase` model validator (Phase 1.3)
- [ ] React error boundary in `App.tsx` (Phase 1.4)
- [ ] Default `CORS_ORIGINS` to empty string (Phase 2.5)
- [ ] Add `X-Request-ID` header correlation (Phase 3.1)
- [ ] ESLint + Prettier config for frontend (Phase 4.5)
- [ ] FastAPI `/docs` endpoint polish (Phase 5.5)
