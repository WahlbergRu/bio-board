# Risks: Chat Command Suggestions

| Risk | Severity | Mitigation | Status |
|------|----------|------------|--------|
| False positive: "/" in normal text triggers overlay unexpectedly | Medium | Allow Escape to close; overlay is non-intrusive | Mitigated |
| Command list drift: frontend commands out of sync with backend | Low | Command list is static, small, unlikely to change often; add TODO comment to sync | Accepted |
| Mobile overlay positioning issues | Medium | Use fixed positioning below input; test on mobile viewport | Mitigated |
| Keyboard navigation conflicts with existing behavior | Low | Only activate navigation when overlay is visible | Mitigated |
| "/" trigger conflicts with future features using "/" | Low | Document trigger character; can change later | Accepted |
| Bundle size increase | Low | Only adds ~200 lines TSX + 1 data file | Accepted |
| Overlay z-index conflicts with other UI | Low | Use explicit z-index above chat but below modals | Mitigated |
| Russian keyboard "/" position differs | Info | "/" is same key on RU layout — no issue | Resolved |
