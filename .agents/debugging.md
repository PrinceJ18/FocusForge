# debugging.md

# FocusForge Debugging Methodology

Version: 1.0

---

# Purpose

This document defines the mandatory debugging methodology for every AI agent working inside this repository.

The objective is not to silence errors.

The objective is to discover the actual root cause and implement the safest permanent fix.

Never guess.

Never patch symptoms.

Always identify the underlying issue.

---

# Debugging Philosophy

Debugging is an engineering investigation.

Every bug exists because something in the system behaves differently than expected.

The AI must understand:

Expected behavior

Actual behavior

Difference

Cause

Impact

Fix

Verification

---

# Universal Debugging Workflow

Every debugging task follows this sequence:

Observe

↓

Reproduce

↓

Collect Evidence

↓

Trace Execution

↓

Locate Root Cause

↓

Design Fix

↓

Implement

↓

Verify

↓

Regression Check

↓

Document

Never skip directly to implementation.

---

# Step 1 — Observe

Before writing code:

Read:

Error messages

Console output

Network logs

Terminal logs

Browser logs

Stack traces

Screenshots

User description

Do not assume anything.

---

# Step 2 — Reproduce

Attempt to reproduce the issue.

Determine:

Can it always happen?

Only sometimes?

Only after login?

Only on refresh?

Only on mobile?

Only with empty data?

Only for specific users?

Reproducible bugs are easier to solve.

---

# Step 3 — Collect Evidence

Gather evidence before making changes.

Examples:

Stack trace

HTTP status

Database response

Component tree

React DevTools

Browser Console

Network Panel

Supabase logs

State values

Never debug blindly.

---

# Step 4 — Trace Execution

Follow the execution path.

Example:

User Click

↓

Component

↓

Hook

↓

Service

↓

Supabase

↓

Database

↓

Response

↓

State Update

↓

UI

Locate exactly where expected behavior changes.

---

# Step 5 — Root Cause Analysis

Ask repeatedly:

Why did this happen?

until reaching the true cause.

Examples:

Wrong state

Wrong props

Missing dependency

Incorrect query

Authentication failure

Race condition

Async timing

Type mismatch

Incorrect assumption

Root cause must be explained before implementation.

---

# React Debugging

Check:

Component hierarchy

Props

State

Context

Hooks

Dependencies

Rendering order

Infinite renders

Stale closures

Memoization

Avoid assuming React is the problem.

---

# TypeScript Debugging

Never suppress compiler errors.

Read the entire error.

Identify:

Incorrect types

Missing properties

Undefined values

Nullable objects

Wrong generics

Unsafe casting

Fix types rather than bypassing them.

---

# State Management Debugging

Determine:

Who owns the state?

Who modifies it?

Who consumes it?

When does it update?

Is it stale?

Is it duplicated?

Is state synchronized?

State bugs often appear as UI bugs.

---

# Authentication Debugging

Verify:

User session

Access token

Authentication state

Protected routes

Supabase session

User ID

Policies

Authorization

Never assume authentication succeeded.

---

# Database Debugging

Verify:

Query

Filters

Table

Policies

Indexes

Relationships

Returned data

Unexpected null values

Database problems often originate from incorrect assumptions.

---

# API Debugging

Inspect:

Endpoint

Headers

Payload

Status code

Response body

Timeout

Retries

Network failures

Never ignore non-200 responses.

---

# UI Debugging

Verify:

Responsive layout

Overflow

Spacing

Alignment

Conditional rendering

Loading states

Empty states

Error states

Animations

A visual bug may originate from business logic.

---

# Performance Debugging

Investigate:

Large renders

Repeated renders

Expensive calculations

Unnecessary state updates

Large bundle size

Repeated API calls

Slow database queries

Memory usage

Optimize only after measurement.

---

# Async Debugging

Check:

Promises

Await

Race conditions

Timing

Loading state

Cancellation

Duplicate requests

Unexpected execution order

Async bugs rarely come from syntax.

---

# Dependency Debugging

Determine:

Which file depends on which?

What changed?

What recently broke?

Could a shared utility affect multiple modules?

Always trace dependencies before modifying shared code.

---

# Regression Prevention

Before finalizing:

Review:

Authentication

Navigation

Forms

Dashboard

Finance

Analytics

Tasks

Shared components

Never fix one bug while introducing another.

---

# Safe Fix Strategy

Preferred order:

Smallest fix

↓

Localized fix

↓

Reusable fix

↓

Architectural improvement

Avoid rewriting unrelated code.

---

# Dangerous Behaviors

Never:

Guess

Disable TypeScript

Ignore errors

Remove code randomly

Delete functionality

Introduce hacks

Comment out failing logic

Hardcode values

Every fix should improve the codebase.

---

# Verification Checklist

After implementation verify:

Bug resolved

No new errors

No TypeScript issues

No lint issues

UI behaves correctly

Authentication works

Data remains correct

Performance unaffected

No regression introduced

---

# Documentation

If the bug revealed an architectural weakness,

update:

architecture.md

coding-standards.md

workflow.md

when appropriate.

Prevent the same class of bug from happening again.

---

# Debugging Mindset

A professional engineer spends significantly more time understanding the bug than writing the fix.

Invest time in investigation.

The best fix is the one that permanently removes the root cause while keeping the architecture clean.

---

# Final Rule

Never optimize for the fastest fix.

Always optimize for the most correct, maintainable, and future-proof solution.

The repository should become more stable after every debugging session.
