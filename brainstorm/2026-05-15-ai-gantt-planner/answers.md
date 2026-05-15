# Answers — AI-Native Gantt Planner

## Requirements
1. **View modes**: Yes (Day/Week/Month/QuarterYear)
2. **Task types**: task, milestone, project — UI only in Russian
3. **Dependency arrows**: Inside Gantt? Yes, keep Finish-to-Start only for now
4. **Chat history**: Yes, remember across sessions
5. **Excel import**: Both modes — overwrite or merge
6. **Date format**: Auto-detect, use JS library (date-fns)
7. **Inline editing in modal**: Yes
8. **Progress editable**: Both Gantt drag and chat
9. **Task grouping**: Flat with grouping (by assignee)
10. **Excel export**: Include dependency information

## Constraints
11. **LLM API key**: Hardcoded (env-var), not user-configurable in UI
12. **Max tasks**: 500
13. **JSON persistence**: Manual save button + auto-save on input
14. **Offline/PWA**: Possible, sync on save button
15. **Max chat history**: Virtual scroll, load last 100 messages

## Performance
16. **Gantt re-render**: Yes, but depend only on changed files (batch updates)
17. **LLM streaming debounce**: Yes
18. **Excel parsing**: Client-side first, then manual save if all correct
19. **Lazy-load CSS**: No
20. **Large Excel files**: Chunked with processed showing

## Security
21. **Scan Excel**: No (defusedxml on backend is enough)
22. **Rate limit LLM**: Yes
23. **Sanitize descriptions**: Yes (XSS prevention)
24. **Auth on /api/chat**: Simple form with auth + bearer/JWT
25. **MCP auth scopes**: Don't know

## Integration
26. **MS Project import**: —
27. **LLM configurable**: Good if done (multi-model support)
28. **Webhook notifications**: Yes, WebSocket good too
29. **Chat file attachments**: Yes
30. **iCal export**: Yes if possible
31. **Circular dep tests**: Yes
32. **Excel malformed tests**: Yes
33. **Mocked LLM tests**: Yes
34. **100+ task perf tests**: Yes

## Maintenance
35. **Migration path for Gantt lib**: Yes, good solution — update with own rules
36. **Versioned plan.json**: Maybe, don't know
37. **Error logs**: Notification inside application + console
38. **Health-check endpoint**: Yes
