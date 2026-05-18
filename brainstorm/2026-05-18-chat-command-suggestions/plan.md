# Plan: Chat Command Suggestions

## Recommended Approach
**Slash-trigger dropdown** — user types "/" → overlay shows all 7 commands with examples → select fills input.

## Success Criteria
- "/" typed → dropdown with 7 commands appears
- Each command shows: label, syntax example
- Click/Tab/Enter selects → fills input with template
- Escape/click-outside closes overlay
- Keyboard accessible (↑↓ navigate, Tab/Enter select, Escape close)
- No false triggers (only "/" activates)
- Works on mobile
- Coexists with existing LLM suggestion buttons
- No backend changes required

## Implementation Phases

### Phase 1: Command Definitions
**File**: `frontend/src/data/commands.ts`
- Static array of 7 command definitions
- Each: `{ id, label, template, keywords, description }`
- Keywords for filtering: ["сдвинь", "скопируй", "удали", ...]

### Phase 2: CommandOverlay Component
**File**: `frontend/src/components/CommandOverlay.tsx`
- Props: `visible, commands, filterText, onSelect, onClose`
- Renders dropdown below input
- Keyboard navigation: ↑↓ highlight, Enter/Tab select, Escape close
- Click outside closes
- Filter commands by `filterText`
- Shows hint: "↑↓ navigate, Tab select, Esc close"

### Phase 3: ChatPanel Integration
**File**: `frontend/src/components/ChatPanel.tsx` (modify)
- Add state: `showCommands: boolean`, `commandFilter: string`
- Detect "/" in input onChange → set `showCommands = true`
- Extract text after "/" as `commandFilter`
- Render `<CommandOverlay>` above input bar
- On select: fill input with template, close overlay
- On Escape/close: keep "/" in input or remove it (remove for cleaner UX)

### Phase 4: Polish
- Add visual hint in placeholder: "Введите / для команд"
- Style overlay to match dark theme
- Mobile touch-friendly sizing
- Test all cases from cases.md

## Files Modified
| File | Change |
|------|--------|
| `frontend/src/data/commands.ts` | NEW — command definitions |
| `frontend/src/components/CommandOverlay.tsx` | NEW — dropdown component |
| `frontend/src/components/ChatPanel.tsx` | MODIFIED — integrate overlay |
| `frontend/src/i18n.ts` | MODIFIED — add command-related strings |

## No Backend Changes Required

## Order of Execution
1. Create `commands.ts` (static data)
2. Create `CommandOverlay.tsx` (isolated component)
3. Modify `ChatPanel.tsx` (integration)
4. Update `i18n.ts` (strings)
5. Manual testing against cases.md

## Dependencies
- None external
- Uses existing React, TypeScript, inline styles
