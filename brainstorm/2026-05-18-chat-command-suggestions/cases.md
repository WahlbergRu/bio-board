# Cases: Chat Command Suggestions

## Use Cases

### Happy Path
- **UC-01**: User types "/" → overlay appears with 7 commands → user clicks "Добавь задачу" → input fills with "добавь задачу " → user types name → sends
- **UC-02**: User types "/" → overlay appears → arrow down to "Сдвинь" → Tab → input fills → user edits → sends
- **UC-03**: User types "/" → overlay appears → Escape → overlay closes → input still has "/" → user continues typing message
- **UC-04**: User types "/сд" → overlay filters to show only "Сдвинь" command → Enter → fills input
- **UC-05**: User types "/" → overlay appears → clicks outside → overlay closes

### Alternative Paths
- **UC-06**: User types "/" → overlay appears → clicks command → input filled → user deletes all text → overlay should not reappear
- **UC-07**: User types "/" → overlay appears → arrow keys navigate → Enter selects → overlay closes
- **UC-08**: User types "/" → overlay appears → types more characters → overlay filters results
- **UC-09**: User has existing LLM suggestion buttons visible → types "/" → command overlay appears → both systems coexist
- **UC-10**: User is on mobile → types "/" → overlay appears → taps command → input fills

### Error Recovery
- **UC-11**: User types "/" → overlay appears → no tasks exist in plan → overlay still shows all commands (create task works without existing tasks)
- **UC-12**: User types "//" → only first "/" triggers overlay → second "/" is part of input
- **UC-13**: User types "task / name" → "/" in middle → overlay triggers → user sees it was unintended → Escape → continues
- **UC-14**: User pastes text with "/" → overlay triggers → user Escape → continues

## Test Scenarios

### Functional
- **TS-01**: "/" at start of empty input → overlay shows all 7 commands
- **TS-02**: "/" at start of existing text → overlay shows, existing text preserved after "/"
- **TS-03**: Clicking command button fills input with correct template
- **TS-04**: Arrow Up/Down navigates overlay items
- **TS-05**: Enter selects highlighted item
- **TS-06**: Tab selects highlighted item and closes overlay
- **TS-07**: Escape closes overlay without modifying input
- **TS-08**: Click outside overlay closes it
- **TS-09**: Typing after "/" filters overlay items
- **TS-10": Overlay closes when input is cleared

### Integration
- **TS-11**: Command overlay coexists with LLM suggestion buttons
- **TS-12**: Selected command from overlay is parsed correctly by CommandEngine
- **TS-13**: SSE streaming still works after command overlay interaction

### Performance
- **TS-14**: Overlay renders within 100ms of "/" detection
- **TS-15**: No lag when typing with overlay open
- **TS-16**: Overlay re-renders correctly on rapid typing

### Regression
- **TS-17**: Existing chat send (Enter) still works
- **TS-18**: Existing LLM suggestions still work
- **TS-19**: Existing input disabled state still works
- **TS-20**: Mobile input still works

## Edge Cases

### Input Boundary
- **EC-01**: "/" at position 0 in input → trigger
- **EC-02**: "/" at position 5 in input → still trigger (per spec)
- **EC-03**: "/" followed by space → trigger with empty filter
- **EC-04**: "/" followed immediately by letter → trigger with filter
- **EC-05**: Only "/" in input, then backspace → overlay should close

### Concurrency
- **EC-06**: SSE response arrives while overlay is open → both handle independently
- **EC-07**: User types fast — overlay should not flicker or miss triggers

### State Machine
- **EC-08**: Overlay open → input cleared → overlay closes
- **EC-09**: Overlay open → loading starts → overlay closes
- **EC-10": Overlay open → user switches tabs → overlay state preserved

## Security & Abuse

### Input Validation
- **SA-01**: "/" + XSS payload → overlay shows, payload only fills input (no execution until send)
- **SA-02": "/" + SQL injection → no impact (client-side only)

### Access
- **SA-03**: Unauthenticated user types "/" → overlay shows but send is disabled
- **SA-04": Command templates don't expose sensitive data
