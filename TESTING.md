# Testing & QA Guide

FocusForge relies on manual QA regression passes and automated typings to ensure stability.

## 1. Regression Testing

A comprehensive end-to-end (E2E) regression pass was executed for v1.0, covering all core workflows:
- **Authentication**: Registration, login, and robust session persistence.
- **Core Loops**: Dashboard interactions, Pomodoro Focus sequences, and Task modifications.
- **Finance**: Adding, editing, deleting, and visualizing expenses and budgets.
- **Social**: Friend requests (sending, accepting, declining), searching via Friend Codes.
- **Arena**: Realtime leaderboard calculations and activity feed events.

*Result: 100% Pass across all domains.*

## 2. Manual QA Guidelines

When submitting new PRs or modifying features, engineers must manually verify the following critical paths:
1. **Network Disruption**: Disconnect internet during a Focus Session. Verify that Zustand retains the local timer state and attempts to resync upon reconnection.
2. **Idempotency**: Rapidly double-click submission buttons in `ExpenseModal` or `TaskFormModal` to ensure duplicate database entries are not created (verified by active `isLoading` component state disabling).
3. **RLS Integrity**: Register a dummy user. Attempt to query `user_financial_settings` of a different user ID via browser dev tools. Verify that Supabase rejects the request.

## 3. Known Limitations (v1.0)
- **Automated Tests**: Cypress/Playwright E2E suites and Jest unit tests are currently omitted. Regression is performed manually or via AI subagent verification.
- **Offline Writes**: While the client maintains local state offline, complex writes (e.g. adding friends offline) will fail gracefully via `try/catch` and ask the user to retry when online.
- **Browser Compatibility**: Safari on older iOS versions may suppress background timer execution due to aggressive battery-saving constraints on `setInterval`.
