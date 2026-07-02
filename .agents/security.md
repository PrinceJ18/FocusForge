# security.md

# FocusForge Security Engineering Guide

Version: 1.0

---

# Purpose

Security is a core engineering requirement.

Every feature must be designed, implemented, and reviewed with security in mind.

Never treat security as an optional enhancement.

Every AI agent must assume the application may eventually be deployed publicly.

---

# Security Philosophy

Security should be:

Proactive

Layered

Simple

Maintainable

Auditable

Default to the safest implementation.

Never choose convenience over security.

---

# Security Priorities

Priority order:

1. User Data
2. Authentication
3. Authorization
4. Database Security
5. Secrets Management
6. Input Validation
7. Secure Communication
8. Logging
9. Performance

---

# Trust Model

Never trust:

User input

Client state

Local Storage

Query parameters

URL parameters

Cookies

Headers

Every external input must be validated.

---

# Authentication

Authentication is handled only by Supabase Auth.

Never implement a custom authentication system.

Supported methods:

Email & Password

Google OAuth

Future providers should integrate into the same architecture.

---

# Authorization

Authentication identifies the user.

Authorization determines what they may access.

Never rely on frontend authorization.

Authorization belongs in:

Supabase

Row Level Security

Database Policies

---

# Row Level Security

Every user-owned table must:

Enable RLS

Restrict user access

Prevent cross-user reads

Prevent cross-user updates

Prevent cross-user deletes

Never disable RLS.

---

# Environment Variables

Sensitive values belong only in:

.env

Never hardcode:

API Keys

Tokens

Secrets

Database URLs

Service Role Keys

---

# Service Role Key

The Service Role Key must never:

Appear in frontend code

Appear in Git

Be exposed to users

Be logged

Remain server-side only.

---

# Input Validation

Validate:

Text

Numbers

Email

Dates

Files

URLs

IDs

Enums

Never trust browser validation alone.

---

# Output Encoding

Treat displayed content carefully.

Prevent unintended HTML rendering.

Avoid unsafe rendering mechanisms.

Prefer React's default escaping behavior.

Never bypass it without necessity.

---

# XSS Prevention

Never render user-generated HTML directly.

Avoid dangerous rendering APIs.

Sanitize content when HTML support becomes necessary.

Default to plain text.

---

# CSRF Considerations

Prefer authenticated API flows.

Validate user identity before sensitive actions.

Never perform destructive actions without authorization.

---

# SQL Safety

Always use Supabase query APIs.

Never construct SQL dynamically from user input.

Avoid unsafe query generation.

Prefer parameterized operations.

---

# File Upload Security

Validate:

File type

File size

Allowed extensions

Storage location

Reject unsupported uploads.

Never trust file names.

---

# Password Policy

If passwords are handled:

Minimum length

Strong password guidance

Secure reset flow

Never store passwords manually.

Authentication remains Supabase's responsibility.

---

# Session Security

Verify:

Authenticated session

Expired sessions

Revoked sessions

Logout behavior

Protected routes

Never assume a session is valid.

---

# Logging

Never log:

Passwords

Tokens

Secrets

Sensitive user data

Payment information

Personally identifiable information

Logs should assist debugging without exposing private data.

---

# Error Messages

Show users:

Helpful

Safe

Actionable

messages.

Do not expose:

Database schema

Internal stack traces

Secrets

Server paths

Implementation details

---

# Dependency Security

Avoid unnecessary dependencies.

Prefer actively maintained libraries.

Review packages before adoption.

Remove unused dependencies.

Keep dependencies updated.

---

# Data Privacy

Collect only necessary information.

Store only required information.

Display only authorized information.

Delete information safely.

Respect user privacy.

---

# Database Security

Every query should:

Filter by user

Validate inputs

Handle failures

Return only required columns

Avoid unnecessary exposure.

---

# API Security

Validate:

Authentication

Authorization

Request payload

Response data

Rate limiting (future)

Do not expose internal implementation details.

---

# Secrets Management

Secrets belong only in secure configuration.

Never:

Commit secrets

Share secrets

Log secrets

Expose secrets

Rotate compromised secrets immediately.

---

# Browser Storage

Avoid storing sensitive information unnecessarily.

Prefer secure session management.

Never expose confidential information in local storage.

---

# Security Review Workflow

Before completing a feature ask:

Can users access another user's data?

Are secrets protected?

Are inputs validated?

Are outputs safe?

Is authorization enforced?

Are logs safe?

Could this introduce XSS?

Could this expose internal data?

---

# OWASP Awareness

Review every feature for:

Broken Access Control

Cryptographic Failures

Injection

Insecure Design

Security Misconfiguration

Vulnerable Components

Authentication Failures

Integrity Failures

Logging Failures

Server-side Request Risks

---

# Security Checklist

Before completion verify:

✓ Authentication secure

✓ Authorization enforced

✓ RLS enabled

✓ Inputs validated

✓ Outputs safe

✓ Secrets protected

✓ Environment variables used

✓ No sensitive logs

✓ No unnecessary permissions

✓ No hardcoded credentials

---

# AI Security Rules

Whenever modifying authentication or backend logic:

Read:

AGENTS.md

architecture.md

supabase-rules.md

Understand security implications before implementation.

Never implement security-sensitive changes without reviewing related files.

---

# Anti-Patterns

Never:

Disable RLS

Hardcode secrets

Expose service role keys

Trust frontend validation

Store passwords

Ignore authentication

Ignore authorization

Suppress security warnings

Disable HTTPS in production

Leak internal errors

---

# Definition of Secure

Secure software:

Protects users

Protects data

Fails safely

Limits permissions

Validates inputs

Prevents unauthorized access

Maintains confidentiality

Maintains integrity

Maintains availability

---

# Final Rule

Whenever multiple implementations exist,

choose the implementation that provides the strongest security while maintaining readability and maintainability.

Security is a permanent engineering responsibility, not a feature.
