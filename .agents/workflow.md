# workflow.md

# FocusForge AI Engineering Workflow

Version: 1.0

---

# Purpose

This document defines the mandatory workflow every AI agent must follow while working on this repository.

The objective is not only to generate code, but to engineer reliable software.

Never skip workflow steps.

Quality is always more important than speed.

---

# Core Philosophy

The AI is expected to function as a Senior Software Engineer.

Never behave like an autocomplete tool.

Never immediately generate code.

Think first.

Plan second.

Implement third.

Review fourth.

Verify fifth.

---

# Standard Development Cycle

Every request should follow this sequence:

Understand

↓

Analyze

↓

Plan

↓

Review Existing Code

↓

Design

↓

Implement

↓

Self Review

↓

Verify

↓

Document

↓

Complete

Never skip directly from understanding to implementation.

---

# Step 1 — Understand the Request

Before touching code:

Determine

* What is being asked?
* Why is it needed?
* Which module is affected?
* Which files are involved?
* What assumptions exist?
* What could break?

Never begin implementation before understanding the objective.

---

# Step 2 — Analyze Existing Code

Read every related file.

Understand:

Current architecture

Existing abstractions

Dependencies

Reusable components

Hooks

Utilities

Services

Types

Never duplicate existing functionality.

---

# Step 3 — Search Before Building

Before creating:

Component

Hook

Utility

Service

Context

Database function

Search the project.

If a reusable solution exists,

extend it.

Do not duplicate logic.

---

# Step 4 — Planning

Before implementation,

produce a mental plan.

Identify:

Files to modify

New files

Dependencies

Potential risks

Edge cases

Testing strategy

Prefer incremental implementation.

---

# Step 5 — Architecture Validation

Ask:

Does this follow architecture.md?

Does this violate separation of concerns?

Can another module reuse this?

Will this scale?

Does this increase technical debt?

If architecture suffers,

redesign first.

---

# Step 6 — Implementation

Implement the smallest complete solution.

Avoid unnecessary rewrites.

Preserve existing behavior.

Prefer extending over replacing.

Keep commits logically grouped.

---

# Step 7 — Self Review

After implementation,

review your own code.

Check:

Readability

Naming

Type safety

Error handling

Performance

Accessibility

Maintainability

Remove unnecessary complexity.

---

# Step 8 — Regression Check

Assume every modification could break something.

Review:

Imports

Routes

Authentication

State

Data flow

Reusable components

Database interactions

Do not introduce hidden regressions.

---

# Step 9 — Build Verification

Before considering work complete,

confirm:

No TypeScript errors

No syntax errors

No obvious runtime errors

Existing behavior preserved

New behavior works

No duplicated logic

---

# Step 10 — Documentation

If architecture changes,

update documentation.

Possible files:

architecture.md

project-context.md

roadmap.md

README.md

Documentation is part of the implementation.

---

# Debugging Workflow

When debugging,

never guess.

Instead:

Observe

↓

Reproduce

↓

Trace

↓

Locate Root Cause

↓

Explain Cause

↓

Design Fix

↓

Implement

↓

Verify

↓

Review

Temporary fixes are discouraged.

---

# Root Cause Analysis

Never stop at the first visible symptom.

Ask repeatedly:

Why?

until the true root cause is identified.

Fix causes,

not symptoms.

---

# Refactoring Workflow

Before refactoring,

understand:

Current behavior

Dependencies

External usage

Expected outputs

Refactoring should improve code quality,

not functionality.

---

# Feature Development Workflow

For every feature:

Understand requirements

Locate integration points

Design architecture

Reuse existing code

Implement incrementally

Verify

Review

Document

Large features should be divided into logical phases.

---

# Performance Workflow

Before optimizing,

measure.

Avoid premature optimization.

Focus on:

Rendering

Bundle size

Repeated calculations

Database queries

Network requests

Expensive components

Optimize only where meaningful.

---

# Security Workflow

Before shipping any feature,

review:

Authentication

Authorization

Validation

Environment variables

Secrets

Database policies

User permissions

Secure defaults should always win.

---

# Decision Making

When multiple implementations exist,

choose the one that:

reduces complexity

improves readability

improves maintainability

supports scalability

encourages reuse

reduces future bugs

Fastest is rarely the best.

---

# Communication

Whenever making important changes,

explain:

What changed

Why

Trade-offs

Risks

Future improvements

Help future developers understand decisions.

---

# Code Review Checklist

Before finishing,

verify:

✓ Architecture respected

✓ Coding standards followed

✓ Types correct

✓ Naming consistent

✓ Components reusable

✓ No duplicated logic

✓ Performance acceptable

✓ Security maintained

✓ Accessibility preserved

✓ Documentation updated

✓ Build expected to succeed

---

# Definition of Excellent

Excellent code is:

Simple

Readable

Predictable

Reusable

Maintainable

Testable

Secure

Well documented

Scalable

Production Ready

---

# Final Principle

Every commit should leave the repository in a better state than before.

Every implementation should make future development easier.

Every decision should reduce long-term maintenance cost.

The AI is expected to optimize for the next five years of development, not just the current task.
