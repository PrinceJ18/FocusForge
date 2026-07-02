# testing.md

# FocusForge Testing Strategy

Version: 1.0

---

# Purpose

Testing is a mandatory engineering activity.

Every implementation must be verified before it is considered complete.

The objective of testing is to prove correctness, reliability, maintainability, and stability.

Testing is part of development—not an optional final step.

---

# Testing Philosophy

Never assume code works.

Always verify.

Every feature must demonstrate:

* Correctness
* Stability
* Reliability
* Expected behavior
* Safe integration

---

# AI Testing Workflow

Every completed task follows:

Understand

↓

Implement

↓

Review

↓

Test

↓

Regression Test

↓

Edge Case Test

↓

Performance Check

↓

Complete

Never skip verification.

---

# Test Categories

Every feature should be evaluated using these categories:

* Functional Testing
* UI Testing
* State Testing
* Database Testing
* Authentication Testing
* Validation Testing
* Error Handling Testing
* Responsive Testing
* Accessibility Testing
* Regression Testing

---

# Functional Testing

Verify:

Feature behaves exactly as intended.

Inputs produce expected outputs.

Buttons perform correct actions.

Forms submit correctly.

Navigation works.

No unexpected behavior exists.

---

# UI Testing

Inspect:

Layout

Spacing

Typography

Alignment

Colors

Overflow

Icons

Animations

Loading indicators

Empty states

Error states

The UI should remain visually consistent.

---

# Responsive Testing

Verify layouts on:

Mobile

Tablet

Laptop

Desktop

Large Desktop

Avoid horizontal scrolling.

Avoid overlapping components.

Avoid clipped text.

---

# Authentication Testing

Test:

Login

Logout

Session persistence

Protected routes

Unauthorized access

Expired session

Invalid credentials

Supabase authentication state

---

# Database Testing

Verify:

Correct records are created.

Updates work.

Deletes work safely.

Queries return expected results.

Relationships remain valid.

No duplicate records.

RLS policies respected.

---

# Form Validation

Test:

Required fields

Optional fields

Invalid inputs

Long text

Special characters

Whitespace

Duplicate submissions

Error messages

Success messages

---

# State Testing

Verify:

State updates correctly.

State remains synchronized.

No stale state.

No duplicated state.

No unnecessary re-renders.

Loading state behaves correctly.

---

# Error Handling

Every feature must handle:

Loading

Empty

Success

Failure

Unexpected server response

Network failure

Authentication failure

Database failure

The application should never fail silently.

---

# Navigation Testing

Verify:

Routes

Back navigation

Deep links

Protected pages

Sidebar

Header navigation

Redirects

404 handling

---

# API Testing

Verify:

Correct endpoint

Correct payload

Correct headers

Expected response

Failure handling

Retries

Timeouts

Graceful degradation

---

# Performance Testing

Observe:

Initial load

Page transitions

API latency

Rendering speed

Scrolling

Animations

Memory usage

Avoid unnecessary computations.

---

# Accessibility Testing

Verify:

Keyboard navigation

Focus states

Labels

ARIA where required

Contrast

Semantic HTML

Screen reader compatibility where practical.

---

# Regression Testing

Every change must verify that unrelated functionality still works.

Check:

Dashboard

Finance

Productivity

Analytics

Authentication

Settings

Shared components

Navigation

Never assume unrelated code remains unaffected.

---

# Edge Case Testing

Always test:

Empty arrays

Null values

Undefined values

Very long text

Very short text

Slow internet

No internet

Large datasets

Rapid user interaction

Unexpected sequences

---

# AI Self-Test

Before completing any task, ask:

Did I test all affected functionality?

Could another feature have broken?

Did I verify assumptions?

Did I test failure cases?

Did I test boundary conditions?

---

# Manual Testing Checklist

Before considering work complete:

✓ Feature works

✓ UI correct

✓ Responsive

✓ No console errors

✓ No TypeScript errors

✓ Authentication works

✓ Data correct

✓ Loading states work

✓ Error states work

✓ Empty states work

✓ Existing functionality preserved

---

# Definition of Tested

A feature is considered tested only when:

Expected behavior verified.

Failure behavior verified.

Edge cases verified.

Regression risk evaluated.

User experience confirmed.

---

# Testing Mindset

Testing is not about proving code is correct.

Testing is about attempting to prove it wrong.

Only after surviving verification should code be considered production-ready.

---

# Final Rule

Never mark a feature complete because the code compiles.

Mark it complete only after it behaves correctly under realistic usage scenarios.
