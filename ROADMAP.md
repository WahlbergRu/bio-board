# Roadmap to Production

## Technical Debts

| Area | Shortcut | Impact |
|------|----------|--------|
| Storage | In-memory store + JSON file | Data loss on concurrent writes, no ACID |
| Auth | Basic JWT only | No OAuth2/Keycloak, no multi-user roles |
| Date Validation | No date range checks | End before start possible |
| Pagination | None | All tasks in one response |
| Frontend | No error boundaries | White screen on JS error |
| E2E Testing | None | Regressions undetected |
| CORS | Defaults to `*` | Open to any origin in default config |
| Secrets | Env vars only | Key exposure risk |
| WebSocket | Echo-only endpoint | No real real-time sync |
| Logging | No structured logs | Impossible to debug production issues |
| Monitoring | No metrics | Blind to errors/performance |
| CI/CD | Manual deployment | No automated pipeline |

## What's Missing for Production

### HIGH Priority — Must Have

| # | Item | Description | Effort | Risk if skipped |
|---|------|-------------|--------|-----------------|
| 1 | **Database (PostgreSQL)** | Replace JSON with proper DB. Alembic migrations, connection pooling, transactions | 3-5 days | Data corruption on concurrent writes, no scalability |
| 2 | **Production Auth (Keycloak/OAuth2)** | Replace basic JWT with full OAuth2. RBAC, token refresh, session management | 3-5 days | No multi-tenant support, weak security |
| 3 | **Date Range Validation** | Validate `end_date >= start_date`, no overlapping dependencies | 1 day | Invalid plans, broken Gantt rendering |
| 4 | **Error Boundaries** | React error boundaries + fallback UI + toast on failure | 1 day | White screen on any JS error |

### MEDIUM Priority — Should Have

| # | Item | Description | Effort | Risk if skipped |
|---|------|-------------|--------|-----------------|
| 5 | **CI/CD Pipeline** | GitHub Actions: lint, typecheck, test, build, deploy to K8s | 2-3 days | Manual errors, no quality gates |
| 6 | **E2E Tests** | Playwright: login → upload → edit → export flows | 3-4 days | Regressions in user journeys undetected |
| 7 | **Structured Logging** | JSON logs with correlation IDs, request/response logging | 1-2 days | Impossible to debug production issues |
| 8 | **Monitoring** | Prometheus metrics (req/sec, latency, errors) + Grafana | 2-3 days | Blind to performance degradation |
| 9 | **WebSocket Real-time** | Broadcast plan changes to connected clients | 1-2 days | Users see stale data in multi-user mode |
| 10 | **Pagination** | Cursor-based pagination on `GET /api/tasks/` | 1 day | Slow response with 500+ tasks |

### LOW Priority — Nice to Have

| # | Item | Description | Effort |
|---|------|-------------|--------|
| 11 | **Audit Log** | Track all plan mutations: who, what, when, old→new | 2 days |
| 12 | **Backup Strategy** | Automated DB backups, point-in-time recovery | 1 day |
| 13 | **CORS Hardening** | Default `CORS_ORIGINS` to production domains | 0.5 day |
| 14 | **Secret Management** | Docker secrets or K8s secrets for API keys | 1 day |
| 15 | **LLM Dry-run** | Preview AI changes before applying | 2 days |
| 16 | **ESLint / Prettier** | Frontend code quality enforcement | 1 day |

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **LLM hallucination** — AI modifies plan incorrectly | High | High | Dry-run preview + user confirmation before apply |
| **Data corruption** — JSON file race conditions | High | Critical | Migrate to PostgreSQL ASAP |
| **D3 performance** — 1000+ tasks lag render | Medium | Medium | Virtual rendering, pagination, web workers |
| **OpenAI API downtime** | Medium | High | Fallback to manual editing, retry logic, command engine works offline |
| **Token theft** — JWT without HTTPS | Medium | Critical | Enforce TLS in production |
| **Concurrent edits** — two users modify same task | Low | Medium | Optimistic locking with DB version column |

## Priority Order

```
 1. Database (PostgreSQL)              ████████  HIGH — 3-5 days
 2. Production Auth (OAuth2/Keycloak)  ██████    HIGH — 3-5 days
 3. Date Range Validation              █████     HIGH — 1 day
 4. Error Boundaries                   ████      HIGH — 1 day
 5. CI/CD Pipeline                     █████     MEDIUM — 2-3 days
 6. E2E Tests (Playwright)             █████     MEDIUM — 3-4 days
 7. Structured Logging                 ████      MEDIUM — 1-2 days
 8. Monitoring (Prometheus+Grafana)    ████      MEDIUM — 2-3 days
 9. WebSocket Real-time                ███       MEDIUM — 1-2 days
10. Pagination                         ███       MEDIUM — 1 day
11. Audit Log                          ██        LOW — 2 days
12. Backup Strategy                    ██        LOW — 1 day
13. LLM Dry-run                        ██        LOW — 2 days
14. CORS Hardening                     █         LOW — 0.5 day
15. Secret Management                  █         LOW — 1 day
16. ESLint / Prettier                  █         LOW — 1 day
```

## Estimated Total Effort

| Phase | Items | Duration | Key Deliverable |
|-------|-------|----------|-----------------|
| **Phase 1** — Stability | DB + Date Validation + Error Boundaries | 1-2 weeks | Persistent, validated, crash-resilient |
| **Phase 2** — Security | OAuth2 + CORS Hardening + Secrets | 1-2 weeks | Production-ready auth and security |
| **Phase 3** — Operations | CI/CD + Logging + Monitoring | 1-2 weeks | Observable, automated deployment |
| **Phase 4** — Quality | E2E Tests + Pagination + WebSocket | 1-2 weeks | Tested, real-time, scalable |
| **Phase 5** — Polish | Audit Log + Backup + LLM Dry-run + ESLint | 1 week | Auditable, user-friendly |

**Total: 5-8 weeks** for production-ready deployment.

## Quick Wins (Can be done in parallel, < 2 days each)

- [ ] Date range validation in `TaskBase` validator
- [ ] React error boundaries in `App.tsx`
- [ ] Default `CORS_ORIGINS` to empty string instead of `*`
- [ ] ESLint + Prettier config for frontend
- [ ] Add `X-Request-ID` header correlation
