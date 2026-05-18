# Analysis: Chat Command Suggestions

## WHITE Hat (Facts)
- Tech: React + TypeScript frontend, no existing autocomplete infrastructure
- 7 command categories, ~40 Russian keywords
- Current suggestions: LLM-driven, server-side, post-parse-failure only
- SSE streaming already implemented for chat
- Zustand store for state management
- No external dependencies (no autocomplete libraries)

## RED Hat (Intuition)
- "/" trigger feels natural — users expect it
- Inline dropdown could be visually complex in existing chat layout
- Existing Suggestion buttons (post-LLM) provide precedent for clickable commands
- Users unfamiliar with Bag-of-Words syntax — discoverability is real problem
- "команды" keyword as trigger might conflict with actual task names

## BLACK Hat (Risks)
- Keyword detection could fire on false positives (e.g., task named "сдвинь")
- Inline dropdown could overlap chat messages on small screens
- Maintaining command list in sync with backend is drift risk
- Adding client-side logic increases bundle slightly
- Trigger character "/" might interfere with normal text input
- Over-engineering risk — simple solution vs complex autocomplete

## YELLOW Hat (Strengths)
- Command list is small (7 actions) — simple to implement
- Existing Suggestion button UI can be reused/adapted
- No backend changes needed — pure frontend feature
- Zustand store already available for state
- No external dependencies required

## GREEN Hat (Alternatives)

### A) Slash-trigger dropdown (RECOMMENDED)
User types "/" → dropdown shows all 7 commands with examples. Select or Tab to fill input.
- Pros: explicit trigger, no false positives, standard UX pattern
- Cons: users need to know "/" exists

### B) Keyword detection (smart)
User types "добавь" → dropdown shows "Добавь задачу {name}" template
- Pros: contextual, helpful
- Cons: false positives, complex detection logic

### C) Persistent "Команды" button
Button near input → click → shows command list as buttons
- Pros: always visible, no trigger needed
- Cons: takes screen space, less discoverable than inline

### D) Hybrid: "/" trigger + "команды" keyword + keyword detection
All three mechanisms active simultaneously
- Pros: maximum discoverability
- Cons: most complex, potential conflicts

### E) Backend API endpoint
New endpoint GET /api/commands → returns command definitions
- Pros: single source of truth, no sync drift
- Cons: network round-trip, unnecessary for static data

## BLUE Hat (Plan)
**Recommended: Option A (Slash-trigger dropdown) with lightweight keyword detection.**

Rationale:
- "/" is standard and expected
- Small command list = simple implementation
- No backend changes = fast delivery
- Can extend to keyword detection later if needed

### Implementation Phases:
1. Create static command definitions (frontend/src/data/commands.ts)
2. Add autocomplete overlay component to ChatPanel
3. Implement "/" trigger detection on input change
4. Add navigation (arrow keys + Tab/Enter) + mouse click
5. Integrate with existing suggestion button system (optional: merge or coexist)

### Success Criteria:
- "/" typed → dropdown appears with all 7 commands
- Each command shows: Russian name, syntax example, action type
- Click or Tab selects command, fills input with template
- Dropdown closes on Escape or blur
- No false triggers (only "/" activates)
- Works on mobile (touch-friendly)
- Keyboard accessible
