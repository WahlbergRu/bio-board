# Roadmap to Production

## Technical Debts

Conscious shortcuts taken for MVP delivery:

| Area | Shortcut | Impact |
|------|----------|--------|
| Storage | In-memory store (`dict`), JSON file | Data loss on crash, no concurrency |
| Auth | None | Anyone can read/write/destroy plans |
| Validation | No date sanity checks | End before start, overlapping deps |
| Pagination | None | All tasks in one response |
| Frontend | No error boundaries | White screen on JS error |
| Testing | No E2E tests | Regressions undetected |
| CORS | `allow_origins=["*"]` | Open to any origin |
| Secrets | Env vars only, no vault | Key exposure risk |

## What's Missing for Production

### High Priority

| Item | Description | Effort |
|------|-------------|--------|
| **Database** | PostgreSQL or SQLite with Alembic migrations | 3-5 days |
| **Authentication** | Keycloak/OAuth2 with role-based access | 5-7 days |
| **Input Validation** | Date ranges, dependency cycles, field constraints | 1-2 days |

### Medium Priority

| Item | Description | Effort |
|------|-------------|--------|
| **CI/CD Pipeline** | GitHub Actions: lint, test, build, deploy | 2-3 days |
| **Monitoring** | Prometheus metrics + Grafana dashboards | 2-3 days |
| **Logging** | Structured JSON logs, ELK stack integration | 1-2 days |
| **E2E Tests** | Playwright: full user flows | 3-4 days |
| **Error Boundaries** | React error boundaries, toast notifications | 1 day |
| **Pagination** | Cursor-based pagination on task list | 1 day |
| **WebSocket** | Real-time plan updates for multi-user | 2-3 days |

### Low Priority

| Item | Description | Effort |
|------|-------------|--------|
| **Rate Limiting** | Per-user API rate limits | 1 day |
| **Audit Log** | Track all plan mutations with user/timestamp | 2 days |
| **Backup Strategy** | Automated DB backups, restore procedure | 1 day |
| **CORS Hardening** | Whitelist specific origins | 0.5 day |
| **Secret Management** | Docker secrets or HashiCorp Vault | 1-2 days |

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| **LLM hallucination** — AI modifies plan incorrectly | High | Dry-run preview, user confirmation before apply |
| **Data loss** — no persistent DB | High | Prioritize database migration |
| **CORS in production** — wildcard origin | Medium | Configure before external access |
| **D3 performance** — 1000+ tasks lag | Medium | Virtual rendering, pagination, web workers |
| **OpenAI API downtime** | Medium | Fallback to manual editing, retry logic |
| **Concurrent edits** — race conditions | Low | Optimistic locking with DB |

## Priority Order

```
1. Database (PostgreSQL/SQLite)          ████████ HIGH
2. Authentication (Keycloak/OAuth)       ████████ HIGH
3. Input Validation                      ██████   HIGH
4. CI/CD Pipeline                        █████    MEDIUM
5. Monitoring (Prometheus+Grafana)       █████    MEDIUM
6. E2E Tests (Playwright)                █████    MEDIUM
7. Error Boundaries + Toast              ███      MEDIUM
8. Pagination                            ███      MEDIUM
9. WebSocket Real-time                   ███      MEDIUM
10. Rate Limiting                        ██       LOW
11. Audit Log                            ██       LOW
12. Backup Strategy                      ██       LOW
13. CORS Hardening                       █        LOW
14. Secret Management                    █        LOW
```

## Estimated Total Effort

| Phase | Items | Duration |
|-------|-------|----------|
| **Phase 1** — Stability | DB + Auth + Validation | 2-3 weeks |
| **Phase 2** — Operations | CI/CD + Monitoring + Logging | 1-2 weeks |
| **Phase 3** — Quality | E2E + Error Boundaries + Pagination | 1-2 weeks |
| **Phase 4** — Scale | WebSocket + Rate Limit + Audit | 1-2 weeks |
| **Phase 5** — Hardening | Backup + CORS + Secrets | 3-5 days |

**Total: 6-10 weeks** for production-ready deployment.
