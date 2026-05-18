# Questions: Chat Command Suggestions

## Requirements

1. What trigger character should activate suggestions? "/" recommended — any concerns?
2. Should suggestions appear immediately on "/" or require second character?
3. Should the dropdown show all commands or filter based on what's typed after "/"?
4. Should selecting a command fill the input or send it directly?
5. Should there be a separate "Команды" button for users who don't know about "/"?
6. Should command templates include task names from current plan?
7. Should the overlay show above or below the input field?

## Constraints

8. No external dependencies allowed (no autocomplete libraries)?
9. Must work on mobile/touch devices?
10. Must be keyboard accessible?
11. Should overlay be limited to N visible commands or scrollable?
12. Should command list be hardcoded in frontend or fetched from backend?

## UX

13. Should "/" be consumed (removed) when overlay shows, or kept as prefix?
14. Should there be visual distinction between command overlay and LLM suggestion buttons?
15. Should overlay auto-close after inactivity timeout?
16. Should overlay close when user clicks outside?
17. Should there be a "hint" or "tooltip" mentioning "/" somewhere in the UI?
18. Should commands show icons or just text?

## Edge Cases

19. What if "/" appears in the middle of a sentence (not at start)?
20. What if user types "/" but has no tasks in plan?
21. What if user types "//" or "/ /"?
22. What if overlay is open and user starts typing a message (not command)?
23. Should the overlay support filtering? e.g., "/сд" shows only shift command
24. What if user pastes text containing "/"?
25. Should overlay show keyboard shortcuts (e.g., "↑↓ navigate, Tab select")?

## Technical

26. Should command definitions be a TypeScript interface or plain object?
27. Should each command have an icon component or just text label?
28. Should overlay use fixed positioning or absolute within input container?
29. Should the overlay be a separate component file or inline in ChatPanel?
30. Should command templates use placeholders like "{name}" or be plain text?
31. Should the overlay support Russian keyboard layout ( "/" is same on RU layout)?
