# Architecture Overview

FocusForge implements a decoupled, event-driven architecture designed to support realtime productivity syncing, offline resilience, and social features via a React frontend and a PostgreSQL backend.

## 1. Frontend Architecture

### Framework
- **React 18 & Vite**: Fast HMR during development, optimized static bundle generation for production.

### State Management (Zustand)
Global state is modularized into distinct slices to prevent massive re-renders:
- `authSlice`: User credentials, initialization.
- `settingsSlice`: Local DOM preferences (theme, font size, density).
- `focusSlice`: Manages the timer lifecycle (Pomodoro, Breaks) using custom `setInterval` hooks (`useTimerEngine`).
- `financeSlice`: Balances, custom categories, expense lists, and recurring logic.
- `productivitySlice`: Task CRUD, completion tracking, sections.
- `arenaSlice`: Local caching for leaderboard placement.

### Component Philosophy
- **Container / Presentational Model**: Features are composed of lightweight, highly-reusable UI primitives (`Button.tsx`, `Modal.tsx`) wrapping complex logical containers (`Dashboard.tsx`, `Finance.tsx`).

## 2. Backend & Database (Supabase)

### PostgreSQL & Row Level Security (RLS)
The database operates strictly on RLS. All reads and writes are gated by the current authenticated session:
- **`profiles`**: Public read access (required for Arena and Friends), locked mutations.
- **`user_financial_settings`**: Strictly private. Migrated off `profiles` to ensure sensitive budget parameters are isolated.
- **`tasks` / `expenses`**: Strictly bound to `user_id`.

### Realtime
- WebSockets provided by Supabase Realtime enable instant propagation of Friend Requests and Arena Activity Feed events without manual polling.

## 3. Core Sub-systems

### Authentication
- Uses `@supabase/supabase-js`. 
- Handles OAuth/Email registration. The auth token manages all downstream database access securely.

### Friends Engine
- Utilizes an intermediate `friend_requests` table holding state transitions (`pending`, `accepted`, `rejected`).
- Users are indexed by a 6-character `friend_code` generated randomly upon registration via DB triggers, enabling private searching without revealing email addresses.

### Productivity Arena & Champions
- The Arena calculates points based on daily focus minutes and task completion against set goals.
- An async calculation engine assesses the previous week's performance via cron or first-visit triggers, identifying the highest scorer and permanently freezing their state into the `hall_of_fame` table.

## 4. Future Scalability Considerations
- The current Zustand store loads all data upfront into memory (`storeUtils.ts`). For large production loads, pagination and lazy-loading slices should be integrated into the data-fetching layer.
- Moving heavy computational logic (like Champion selection) entirely into server-side Supabase Edge Functions.
