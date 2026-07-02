# performance.md

# FocusForge Performance Engineering Guide

Version: 1.0

---

# Purpose

Performance is a feature.

Every implementation should consider performance from the beginning without sacrificing readability or maintainability.

The objective is to build software that remains fast as users, data, and features increase.

---

# Performance Philosophy

Performance optimization should be:

Measured

Intentional

Maintainable

Never optimize blindly.

Never optimize code that has not been identified as a bottleneck.

---

# Engineering Priorities

Priority:

Correctness

↓

Readability

↓

Maintainability

↓

Performance

Never trade correctness for small performance gains.

---

# General Principles

Avoid unnecessary work.

Avoid repeated work.

Avoid duplicate work.

Reuse existing calculations whenever practical.

---

# React Rendering

Minimize unnecessary renders.

Every render should have a reason.

Avoid updating state that is not changing.

Avoid unnecessary parent re-renders.

---

# Component Size

Large components are difficult to optimize.

Split components by responsibility.

Prefer:

Presentation Components

Business Components

Layout Components

Reusable Components

---

# State Management

Keep state local whenever possible.

Do not place temporary UI state into global state.

Avoid duplicated state.

Never derive state that can be calculated.

---

# Derived Data

Prefer calculated values instead of duplicated state.

Example:

Bad

Store filtered expenses.

Good

Calculate filtered expenses using existing data.

---

# Memoization

Memoization is a tool.

Not a default.

Use:

useMemo

useCallback

React.memo

only when measurable benefit exists.

Avoid unnecessary memoization.

---

# Expensive Computations

Heavy calculations should not execute during every render.

Move expensive logic into:

Utilities

Hooks

Memoized calculations

Background processing where appropriate.

---

# Lists

Lists should:

Use stable keys.

Avoid index as key.

Avoid unnecessary nested loops.

Render efficiently.

Support virtualization for very large datasets in the future.

---

# Database Queries

Only request required data.

Avoid:

SELECT *

Fetch only required columns.

Filter early.

Limit results.

Support pagination.

---

# API Calls

Avoid duplicate requests.

Reuse existing data.

Cache where appropriate.

Prevent repeated requests caused by unnecessary renders.

---

# Network Performance

Reduce payload size.

Batch requests where practical.

Avoid unnecessary refetching.

Handle offline conditions gracefully.

---

# Images

Use optimized images.

Avoid oversized assets.

Lazy load large images.

Compress before storing.

Prefer SVG for icons.

---

# Bundle Size

Avoid unnecessary libraries.

Prefer native browser APIs.

Import only required modules.

Lazy load heavy pages.

Keep the initial bundle small.

---

# Code Splitting

Split large routes.

Lazy load feature pages.

Delay loading rarely used functionality.

The first screen should load quickly.

---

# Animations

Animations should remain lightweight.

Prefer:

transform

opacity

Avoid layout-triggering animations whenever possible.

Animations should never block interaction.

---

# Charts

Render only necessary datasets.

Avoid excessive animations.

Limit redraws.

Memoize transformed data.

Keep charts responsive.

---

# Forms

Avoid validating every keystroke unless necessary.

Debounce expensive validation.

Prevent duplicate submissions.

Disable actions during requests.

---

# Search

Future search should support:

Debouncing

Efficient filtering

Server-side search for very large datasets

Incremental loading

---

# Authentication

Avoid unnecessary authentication checks.

Reuse existing session.

Do not repeatedly fetch user information.

---

# Caching

Reuse available data.

Avoid repeated calculations.

Avoid repeated requests.

Prefer cache invalidation over unnecessary refetching.

---

# Memory Usage

Avoid memory leaks.

Clean up:

Timers

Intervals

Subscriptions

Realtime listeners

Event listeners

Abort pending requests when appropriate.

---

# Error Recovery

Performance includes recovery.

The application should recover gracefully from:

Slow network

Failed requests

Timeouts

Unexpected server responses

---

# Responsive Performance

The application should remain usable on:

Budget Android devices

Older laptops

Slow internet

High latency networks

Do not optimize only for powerful hardware.

---

# Accessibility Performance

Performance should never reduce accessibility.

Accessibility is not optional.

---

# AI Performance Checklist

Before completing any feature verify:

✓ No unnecessary renders

✓ No duplicate state

✓ No duplicate requests

✓ Efficient queries

✓ Stable list keys

✓ No memory leaks

✓ Bundle impact acceptable

✓ Lazy loading considered

✓ Responsive performance maintained

✓ Existing performance not degraded

---

# Anti-Patterns

Avoid:

Premature optimization

Duplicate calculations

Large monolithic components

Repeated API calls

Repeated database queries

Nested rendering loops

Expensive logic inside JSX

Massive context providers

Blocking UI during network requests

Unoptimized images

Unused dependencies

---

# Definition of Fast

Fast software:

Feels responsive

Loads quickly

Updates smoothly

Uses resources efficiently

Scales with larger datasets

Remains maintainable

---

# Final Rule

Performance improvements should make the application faster without making the code harder to understand.

The fastest code that nobody can maintain is not a successful optimization.
