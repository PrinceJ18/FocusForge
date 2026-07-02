# prompts.md

# FocusForge Professional Prompt Library

Version: 1.0

---

# Purpose

This document contains reusable, production-quality prompts for AI-assisted software engineering.

These prompts are designed to produce consistent, high-quality results across development, debugging, architecture, testing, optimization, and documentation.

Always prefer these prompts over ad-hoc requests.

---

# General Rules

Every prompt assumes the AI has already read:

* AGENTS.md
* project-context.md
* architecture.md
* coding-standards.md
* workflow.md

Always ask the AI to explain its reasoning before implementing major changes.

---

# Project Understanding

## Prompt 1

Analyze the entire repository.

Explain:

* Overall architecture
* Folder structure
* Main modules
* Data flow
* State management
* Authentication flow
* Supabase usage
* Current strengths
* Weaknesses
* Technical debt

Do not modify any files.

---

## Prompt 2

Read the entire project before writing code.

Identify all files related to the requested task.

Explain your understanding before implementation.

---

# Feature Development

## Prompt 3

Implement this feature like a Senior Software Engineer.

Requirements:

* Follow architecture.md
* Follow coding-standards.md
* Reuse existing components
* Do not duplicate logic
* Explain the implementation plan
* List affected files
* Consider edge cases
* Maintain backward compatibility
* Review your own implementation before completion

---

## Prompt 4

Break this feature into small implementation phases.

For each phase explain:

Purpose

Affected files

Dependencies

Risks

Testing strategy

---

# Bug Fixing

## Prompt 5

Do not immediately fix the bug.

Instead:

Reproduce

Investigate

Trace execution

Identify root cause

Explain why it happens

Compare possible solutions

Recommend the safest solution

Then implement.

---

## Prompt 6

Review this bug as a debugging specialist.

Never guess.

Never patch symptoms.

Fix only after identifying the root cause.

---

# Architecture Review

## Prompt 7

Review this project like a Software Architect.

Evaluate:

Folder structure

Coupling

Cohesion

Scalability

Maintainability

Reusability

Technical debt

Suggest improvements ranked by priority.

---

## Prompt 8

Identify architectural weaknesses.

Recommend improvements without rewriting the project.

---

# Code Review

## Prompt 9

Review this code as if reviewing a Pull Request.

Evaluate:

Readability

Maintainability

Performance

Security

Accessibility

Type Safety

Scalability

Code Style

Do not rewrite immediately.

Explain issues first.

---

## Prompt 10

Find code smells.

Rank each issue by severity.

Explain why it matters.

Recommend improvements.

---

# Refactoring

## Prompt 11

Refactor this implementation.

Do not change functionality.

Improve:

Naming

Structure

Readability

Reusability

Maintainability

Type Safety

---

## Prompt 12

Reduce duplication.

Extract reusable logic.

Avoid unnecessary abstractions.

---

# React

## Prompt 13

Review React best practices.

Check:

Hooks

Dependencies

Rendering

State

Props

Composition

Memoization

Component size

---

# TypeScript

## Prompt 14

Review all TypeScript usage.

Find:

Unsafe types

any

Missing interfaces

Incorrect generics

Nullable risks

Type duplication

---

# Supabase

## Prompt 15

Review every database interaction.

Verify:

Queries

Indexes

Filters

RLS

Authentication

Authorization

Error handling

Performance

---

# Performance

## Prompt 16

Review the application for performance.

Analyze:

Rendering

Bundle size

Queries

API calls

Memory

Animations

Charts

State updates

Recommend only measurable improvements.

---

# Security

## Prompt 17

Perform a complete security review.

Evaluate:

Authentication

Authorization

Input validation

Secrets

Environment variables

XSS

Injection risks

RLS

Sensitive data exposure

Rank issues by severity.

---

# UI Review

## Prompt 18

Review this UI using ui-design.md.

Evaluate:

Spacing

Hierarchy

Typography

Consistency

Accessibility

Responsive behavior

Professional appearance

---

# Testing

## Prompt 19

Create a comprehensive testing checklist.

Include:

Functional

Regression

Edge Cases

Performance

Accessibility

Authentication

Database

---

# Documentation

## Prompt 20

Review project documentation.

Identify:

Missing documentation

Outdated documentation

Architecture inconsistencies

Suggest improvements.

---

# Large Feature Planning

## Prompt 21

Design this feature before coding.

Produce:

Architecture

Folder changes

Components

Hooks

Database changes

Risks

Testing strategy

Future scalability

Do not implement until the design is complete.

---

# Technical Debt

## Prompt 22

Identify all technical debt.

Categorize into:

High

Medium

Low

Explain impact and recommended priority.

---

# Dependency Review

## Prompt 23

Review project dependencies.

Identify:

Unused packages

Duplicate packages

Security risks

Large packages

Better alternatives

---

# AI Self Review

## Prompt 24

Review your own implementation.

Assume another Senior Engineer will review it.

Find weaknesses before I do.

---

# Completion Prompt

## Prompt 25

Before considering the task complete verify:

✓ Architecture respected

✓ Types correct

✓ Components reusable

✓ Build expected to succeed

✓ No duplicated logic

✓ Responsive

✓ Accessible

✓ Secure

✓ Tested

✓ Documentation updated

Only then declare the task complete.

---

# Final Principle

The AI should behave like an experienced engineering partner, not a code generator.

Every prompt should encourage:

Thinking

Planning

Explanation

Verification

Documentation

Long-term maintainability

over rapid code generation.
