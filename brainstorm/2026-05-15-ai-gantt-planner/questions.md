# Questions — AI-Native Gantt Planner

## Requirements

1. Should the Gantt support multiple view modes (Day, Week, Month, QuarterYear)?
2. What task types are needed: task, milestone, project — or more?
3. Should dependency arrows support all 4 types (FS, SS, FF, SF) or only Finish-to-Start?
4. Should the chat remember conversation history across sessions?
5. Should Excel import overwrite existing plan or merge with it?
6. What date format should Excel accept: YYYY-MM-DD, DD/MM/YYYY, or auto-detect?
7. Should the task detail modal support inline editing (edit fields directly in modal)?
8. Should progress be editable via Gantt drag, chat, or both?
9. Should the app support task grouping by assignee or project?
10. Should export to Excel include dependency information or just flat task list?

## Constraints

11. Should the LLM API key be hardcoded, env-var, or user-configurable in UI?
12. What's the maximum number of tasks before performance degrades (gantt-task-react limit ~500)?
13. Should the JSON persistence file be auto-saved on every change or manual save?
14. Should the app work offline (PWA) or always require backend?
15. What's the maximum chat message history length before context window overflows?

## Performance

16. Should Gantt re-render on every state change or batch updates?
17. Should LLM streaming be debounced to avoid excessive React re-renders?
18. Should Excel parsing be done client-side (SheetJS) or server-side (openpyxl)?
19. Should the app lazy-load gantt-task-react CSS only when needed?
20. Should large Excel files (>1000 rows) be chunked or rejected?

## Security

21. Should uploaded Excel files be scanned for malicious content (defusedxml)?
22. Should the LLM API calls be rate-limited to prevent abuse?
23. Should task descriptions be sanitized before rendering (XSS prevention)?
24. Should the /api/chat endpoint require authentication?
25. Should MCP tools have authorization scopes (read vs write)?

## Integration

26. Should the app support importing from MS Project (.mpp) format?
27. Should the LLM be configurable (GPT-4, GPT-4o, Claude, local models)?
28. Should the app support webhook notifications for task changes?
29. Should the chat support file attachments (e.g., paste a screenshot of a schedule)?
30. Should the app support iCal export for calendar integration?

## Testing

31. Should circular dependency detection be tested with known cycle patterns?
32. Should Excel import be tested with malformed files (missing columns, wrong types)?
33. Should LLM tool calls be tested with mocked responses (deterministic tests)?
34. Should Gantt rendering be tested with 100+ tasks for performance?

## Maintenance

35. Should there be a migration path if gantt-task-react becomes unusable?
36. Should the plan.json format be versioned for backward compatibility?
37. Should error logs be persisted or only shown in console?
38. Should the app have health-check endpoints for monitoring?
