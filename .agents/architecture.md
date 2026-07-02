# architecture.md

# FocusForge Software Architecture

Version: 1.0

---

# Purpose

This document defines the software architecture of FocusForge.

Every AI agent must understand this architecture before implementing, modifying, or refactoring any feature.

Architecture decisions take priority over implementation convenience.

Never violate the architecture to implement a feature faster.

---

# Architectural Philosophy

FocusForge follows these principles:

* Modular Design
* Separation of Concerns
* Reusable Components
* Predictable Data Flow
* Strong Type Safety
* Feature Isolation
* Scalable Folder Structure
* Low Coupling
* High Cohesion

Every new feature should naturally fit into the existing architecture.

---

# High-Level Architecture

```text
User
   │
   ▼
React UI
   │
   ▼
Pages
   │
   ▼
Reusable Components
   │
   ▼
Custom Hooks
   │
   ▼
Business Logic
   │
   ▼
Supabase Client
   │
   ▼
Authentication
Database
Storage
```

The UI should never communicate directly with the database.

Always move data access through reusable service layers or hooks.

---

# Layer Responsibilities

## Presentation Layer

Responsible for:

* Rendering UI
* User interactions
* Displaying state
* Navigation
* Forms

Never place complex business logic here.

---

## Component Layer

Responsible for:

Reusable UI.

Examples:

Cards

Buttons

Charts

Dialogs

Tables

Navigation

Components should never know database details.

---

## Hook Layer

Responsible for:

Business logic.

Data fetching.

Mutations.

Caching.

Loading states.

Error handling.

Authentication helpers.

Hooks should be reusable across pages.

---

## Service Layer

Responsible for:

Supabase communication.

External APIs.

Authentication.

Storage.

Business services.

Pages should never directly contain database queries.

---

## Database Layer

Supabase handles:

Authentication

PostgreSQL

Storage

Policies

Realtime (future)

The database is the source of truth.

---

# Folder Responsibilities

## src/pages

Entire screens.

No reusable UI should permanently stay here.

---

## src/components

Reusable visual components.

Should not contain application-level logic.

---

## src/hooks

Reusable business logic.

Should hide implementation details from components.

---

## src/services

All communication with Supabase.

Future API integrations.

Authentication helpers.

Notification services.

AI services.

---

## src/utils

Pure helper functions.

Formatting.

Calculations.

Validation.

Date helpers.

Currency helpers.

No side effects.

---

## src/types

Shared interfaces.

Enums.

Utility types.

Domain models.

Avoid duplicated types.

---

## src/constants

Application constants.

Routes.

Limits.

Default values.

Configuration.

---

## src/assets

Static resources.

Images.

Icons.

Fonts.

Animations.

---

# Data Flow

Preferred flow:

```text
User

↓

Page

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
```

Never skip layers without good reason.

---

# Feature Architecture

Every feature should contain:

UI

Business Logic

Validation

Types

Error Handling

Loading State

Success State

Empty State

Documentation

Avoid tightly coupling features together.

---

# State Management

Use local state whenever possible.

Lift state only when necessary.

Separate:

UI State

Business State

Server State

Avoid global state unless multiple pages genuinely require it.

---

# Authentication

Authentication should remain centralized.

Never duplicate authentication logic.

All protected pages should verify user state.

Never trust client-side permissions.

Authorization belongs to Supabase policies.

---

# Database Principles

Each table has one responsibility.

Normalize where appropriate.

Avoid duplicated information.

Use foreign keys.

Use indexes when beneficial.

Respect Row Level Security.

Never bypass security policies.

---

# Error Architecture

Every feature should support:

Loading

Success

Empty

Error

Recovery

The user should never be left without feedback.

---

# Scalability Rules

Future modules should plug into the architecture instead of modifying existing modules.

Examples:

Calendar

Habits

Notifications

AI Coach

Reports

Goals

Analytics

Each should remain independently maintainable.

---

# Component Communication

Preferred:

Parent

↓

Props

↓

Child

Avoid deeply nested prop chains.

Use hooks where shared logic exists.

---

# Reusability Rules

Before creating:

A component

A hook

A utility

A service

Search the project first.

Never duplicate functionality.

Prefer extending existing abstractions.

---

# Dependency Rules

High-level modules should not depend on implementation details.

UI should not depend directly on Supabase.

Business logic should remain testable.

Utilities should not depend on React.

---

# Performance Architecture

Avoid unnecessary renders.

Keep pages lightweight.

Load heavy data lazily.

Memoize only when measurable.

Split large components.

Avoid expensive calculations inside render functions.

---

# Security Architecture

Never expose secrets.

Never expose service role keys.

Validate all user input.

Validate server responses.

Respect authentication boundaries.

Prefer secure defaults.

---

# Documentation Rules

Every major architectural decision should be documented.

Architecture changes should update:

project-context.md

architecture.md

roadmap.md

Never let documentation become outdated.

---

# AI Development Workflow

Whenever implementing a feature:

1. Read AGENTS.md
2. Read project-context.md
3. Read architecture.md
4. Understand existing implementation
5. Search for reusable code
6. Design the implementation
7. Explain the plan
8. Implement
9. Self-review
10. Verify build
11. Update documentation if required

Never begin coding immediately.

Always understand the architecture first.

---

# Long-Term Vision

FocusForge should continue growing without requiring major rewrites.

Architecture decisions should optimize for:

Maintainability

Scalability

Developer Experience

Performance

Reliability

Consistency

Every new feature should feel like it always belonged in the project.

---

# Final Rule

If there are multiple possible implementations, choose the one that:

* keeps the architecture cleaner,
* minimizes future maintenance,
* encourages reuse,
* improves readability,
* reduces technical debt.

Architecture quality is more important than implementation speed.
