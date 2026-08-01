# Deployment Guide

FocusForge consists of a Vite/React frontend and a Supabase PostgreSQL backend.

## 1. Supabase (Backend Database & Auth)

1. Create a new project in the [Supabase Dashboard](https://app.supabase.io).
2. Go to `Project Settings` -> `API` and copy your `Project URL` and `anon public` key.
3. **Run Migrations (CRITICAL ORDER)**:
   In your Supabase SQL Editor, run the migrations found in `supabase/migrations/` in strict chronological order to properly establish schema and relationships:
   
   - `20260703192000_create_profiles_table.sql`
   - `20260703192144_create_preferences_table.sql`
   - `20260704090000_update_tasks_table.sql`
   - `20260704100000_update_tasks_policies.sql`
   - `20260704200000_update_expenses_table.sql`
   - `20260706220000_create_custom_categories_and_goals.sql`
   - `20260707200000_create_friends_tables.sql`
   - `20260709080000_create_arena_tables.sql`
   - `20260709090000_create_champion_tables.sql`
   - `20260709100000_create_arena_activity_table.sql`
   - `20260710150000_add_badges_to_profiles.sql`
   - `20260801010000_secure_financial_profiles.sql`

4. Validate that all tables have RLS (Row Level Security) enabled.

## 2. Vercel (Frontend Hosting)

1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Configure the project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add the following Environment Variables in the Vercel dashboard:

### Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Anon/Public Key |

## 3. Rollback Plan

If a deployment critically fails in production:
1. **Frontend Rollback**: Use the Vercel dashboard to instantly rollback to the previous deployment build.
2. **Database Rollback**: If a schema migration caused the issue, apply the inverse `DROP TABLE` or `ALTER TABLE` commands manually in the Supabase SQL editor. *Always backup your production data prior to applying major schema changes.*
