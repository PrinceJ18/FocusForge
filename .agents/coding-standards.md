# coding-standards.md

# FocusForge Coding Standards

Version: 1.0

---

# Purpose

This document defines the coding standards for the entire FocusForge project.

Every AI agent and developer must follow these rules consistently.

The goal is to keep the project readable, maintainable, scalable, and production-ready.

---

# General Principles

Write code for humans first.

Optimize for readability before cleverness.

Avoid unnecessary complexity.

Keep implementations simple, predictable, and easy to debug.

Every change should improve the repository.

---

# Project Priorities

Priority order:

1. Correctness
2. Readability
3. Maintainability
4. Scalability
5. Performance
6. Developer Experience

Never sacrifice correctness for speed.

---

# Language Standards

Always use:

* TypeScript
* React Functional Components
* ES Modules

Never introduce plain JavaScript files unless absolutely required.

Avoid the `any` type.

Use explicit types whenever practical.

---

# TypeScript Rules

Prefer interfaces for object structures.

Use type aliases for unions and utility types.

Never suppress errors with:

```ts
// @ts-ignore
```

unless there is a documented reason.

Enable strict typing.

Avoid unsafe casting.

Use optional chaining where appropriate.

Prefer null safety.

---

# React Standards

Always use Functional Components.

Prefer Hooks over class components.

Keep components focused on a single responsibility.

Avoid components larger than approximately 250 lines.

Split large components into reusable child components.

---

# Component Design

Each component should:

Have one primary responsibility.

Receive data through props.

Avoid unnecessary state.

Avoid duplicated logic.

Remain reusable.

Be independently understandable.

---

# File Naming

Components

PascalCase

Examples

Dashboard.tsx

ExpenseCard.tsx

LoginButton.tsx

Hooks

camelCase

Examples

useAuth.ts

useExpenses.ts

Utilities

camelCase

Examples

formatCurrency.ts

calculateBudget.ts

Constants

UPPER_SNAKE_CASE only when appropriate.

---

# Folder Organization

Pages

Contain page-level components only.

Components

Contain reusable UI components.

Hooks

Contain reusable logic.

Utils

Contain helper functions.

Services

Contain API communication.

Types

Contain shared TypeScript types.

Never mix responsibilities.

---

# State Management

Keep state as local as possible.

Lift state only when necessary.

Avoid prop drilling.

Prefer reusable custom hooks.

Separate UI state from business logic.

---

# Business Logic

Business logic should not live inside JSX.

Extract complex calculations into helper functions.

Extract reusable behavior into hooks.

Components should primarily render UI.

---

# Functions

Functions should do one thing well.

Prefer smaller functions.

Avoid deep nesting.

Return early instead of nesting multiple conditions.

Use descriptive names.

---

# Naming

Good names explain intent.

Bad

data

item

temp

Good

expenseHistory

monthlyBudget

focusSession

remainingBalance

Use meaningful names.

---

# Imports

Group imports consistently.

Example order

React

Third-party libraries

Internal components

Hooks

Utilities

Types

Styles

Avoid unused imports.

---

# Error Handling

Never silently ignore errors.

Always provide meaningful error messages.

Handle loading states.

Handle empty states.

Handle failure states.

Avoid crashing the UI.

---

# Async Code

Use async/await instead of nested promises.

Always handle errors.

Avoid deeply nested asynchronous code.

---

# Performance

Avoid unnecessary re-renders.

Memoize only when beneficial.

Do not prematurely optimize.

Lazy load heavy pages.

Avoid repeated calculations during rendering.

Keep components lightweight.

---

# Tailwind CSS

Use Tailwind consistently.

Prefer utility classes.

Avoid inline styles.

Reuse class patterns.

Maintain spacing consistency.

Prefer responsive utilities.

Do not create excessively long class strings.

Extract repeated patterns into reusable components.

---

# Styling Principles

Dark-first design.

Consistent spacing.

Consistent typography.

Accessible contrast.

Professional appearance.

Animations should enhance usability, not distract.

---

# Accessibility

Use semantic HTML.

Provide labels for form controls.

Buttons must have meaningful text.

Icons should include accessible labels where appropriate.

Keyboard navigation should work.

---

# Forms

Validate user input.

Never trust client input.

Show clear validation messages.

Prevent duplicate submissions.

Disable submit buttons during requests.

---

# Supabase

Never expose service keys.

Use environment variables.

Validate responses.

Handle authentication failures gracefully.

Keep queries efficient.

Respect Row Level Security (RLS).

---

# Security

Never hardcode secrets.

Never commit API keys.

Never expose sensitive information.

Validate all external input.

Sanitize displayed content when required.

Follow the principle of least privilege.

---

# Logging

Use logging during development.

Avoid leaving unnecessary console statements in production code.

Error logs should be meaningful.

---

# Comments

Write comments only when necessary.

Explain *why*, not *what*.

Avoid obvious comments.

Good documentation is preferred over excessive inline comments.

---

# Refactoring Rules

Improve readability.

Reduce duplication.

Keep behavior unchanged.

Preserve existing functionality.

Refactor incrementally.

---

# Git Standards

Each commit should represent one logical change.

Write descriptive commit messages.

Avoid committing unfinished work to the main branch.

Keep pull requests focused.

---

# Code Review Checklist

Before completing any task, verify:

✓ TypeScript passes

✓ Project builds

✓ No duplicated code

✓ Naming is consistent

✓ Components remain reusable

✓ Existing functionality still works

✓ Responsive layout maintained

✓ Accessibility not degraded

✓ No security issues introduced

✓ Performance remains acceptable

✓ Documentation updated if necessary

---

# Anti-Patterns

Avoid:

Large monolithic components

Deeply nested logic

Magic numbers

Hardcoded strings

Duplicate code

Unnecessary abstractions

Premature optimization

Global mutable state

Copy-paste programming

Ignoring TypeScript errors

Disabling lint rules without reason

---

# Final Standard

Every file should be written as if it will be maintained by a professional engineering team for the next five years.

When in doubt:

Choose the solution that is easiest to understand, easiest to maintain, and least likely to introduce future bugs.
