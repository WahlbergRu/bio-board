# Synthesis — Cross-Task Analysis

## 1. Cross-Task Dependencies

- Gantt library choice (gantt-task-react) affects all frontend implementation
- MCP tool specification drives backend architecture
- LLM prompt design affects chat UX quality
- In-memory state decision affects persistence strategy for all future features
- **Chat command suggestions (2026-05-18)** depends on existing CommandEngine — pure frontend addition, no backend coupling
- Future test coverage tasks depend on command engine test cases

## 2. Recurring Patterns

- **Frontend-first improvements**: Multiple features (chat suggestions, Gantt UI) are frontend-only additions
- **Bag-of-Words parsing**: Simple, dependency-free, but limited discoverability — addressed by "/" overlay
- **Inline styles**: No CSS framework, all components use inline styles — consistent but harder to maintain at scale
- **Dark theme**: All components use dark color scheme (#2a2a4e, #1a1a3a)
- **Russian language**: All UI strings in Russian, i18n system in place

## 3. Contradictions

- LLM suggestions (post-failure) vs command overlay (pre-send): two suggestion systems. Not contradictory — complementary. Overlay is proactive, LLM is reactive.

## 4. Cumulative Risk Matrix

| Risk | Severity | Tasks Affected | Mitigation | Status |
|------|----------|---------------|------------|--------|
| gantt-task-react abandonment | High | Frontend | Wrapper + fallback | Identified |
| LLM hallucination | High | Chat, MCP | Input validation | Identified |
| Circular dependencies | Critical | Store, MCP | DFS detection | Identified |
| Excel malicious files | Medium | Backend | defusedxml | Identified |
| Data loss (in-memory) | Medium | Backend | Auto-save JSON | Identified |
| Command list drift (frontend/backend) | Low | Chat suggestions | Static small list, documented | Identified |
| False "/" triggers in normal text | Medium | Chat suggestions | Escape to close, non-intrusive overlay | Identified |

## 5. Decision Evolution

Not applicable (first task).

## 6. Open Questions

From questions.md — key unresolved decisions for implementation phase:
- Q1: View modes (Day/Week/Month) — recommend starting with Day + Week
- Q3: Dependency types — recommend FS only for demo
- Q5: Excel import behavior — recommend merge (append), not overwrite
- Q6: Date format — recommend YYYY-MM-DD only, strict parsing
- Q11: LLM API key — recommend env var
- Q13: JSON persistence — recommend auto-save on every mutation
- Q21: Excel scanning — recommend defusedxml
- Q27: LLM configurability — recommend env vars for base_url, model, key

## 7. Architecture Insights

1. **MCP as the right abstraction**: Tools map 1:1 to plan operations. Clean separation between LLM interface (MCP) and client interface (REST). Future-proof for multi-client scenarios.

2. **In-memory is deliberate trade-off**: Simplicity over durability. Perfect for demo. JSON file provides basic crash recovery. Would be first thing to upgrade for production.

3. **LLM is the hardest part**: Not the LLM call itself — that's trivial. The hard part is: (a) giving the LLM enough context to make good decisions, (b) validating LLM output before applying to state, (c) handling LLM errors gracefully.

4. **gantt-task-react is the biggest dependency risk**: Stale repo. But the library is simple — if it breaks, migration to frappe-gantt is a weekend project.

5. **State sync is the core challenge**: Gantt drag → REST → state → Gantt re-render AND Chat → LLM → MCP → state → Gantt re-render. Two paths to same state. Must be consistent.

## 8. Hidden Assumptions

1. **Assumption**: LLM understands date math (e.g., "next Monday"). Reality: LLM may compute wrong dates. Mitigation: LLM calls tool with calculated date, backend validates.

2. **Assumption**: Users will describe tasks unambiguously in chat. Reality: "Move that thing after the other thing" is ambiguous. Mitigation: LLM asks clarifying questions.

3. **Assumption**: Task IDs from Excel match existing task IDs. Reality: Excel may use different ID scheme. Mitigation: Excel import creates new IDs, maps predecessors by name if IDs don't match.

4. **Assumption**: Dependencies are always finish-to-start. Reality: Some workflows need parallel starts. Mitigation: FS only for demo, extensible schema for future.

5. **Assumption**: Single LLM call can handle multi-step edits. Reality: "Move A after B and delete C" may require two tool calls. Mitigation: LLM can call multiple tools in one response — supported by OpenAI.
