# FocusForge

FocusForge is an elite, gamified productivity and financial management application built to help users forge discipline through focused work, task mastery, and financial planning. By combining a pomodoro timer, task management, expense tracking, and social accountability features, FocusForge provides a comprehensive dashboard for self-improvement.

## 🚀 Features

- **Auth & Profiles**: Secure registration, login, and robust user profiles.
- **Dashboard Hub**: Widgets for daily goals, active timer, financial snapshot, recent achievements, and upcoming tasks.
- **Focus Timer**: Advanced Pomodoro timer with splits, integrated task selection, and rich statistics.
- **Task Management**: Comprehensive CRUD, custom sections, recurring schedules, and priority sorting.
- **Finance Engine**: Budget tracking, categorized expenses, and recurring subscription reminders.
- **Gamification & Achievements**: Level up system, XP tracking, daily challenges, and badges.
- **Arena & Leaderboards**: Compete globally or with friends in Weekly and Monthly Productivity Arenas.
- **Friends System**: Send/receive requests, search via friend codes, and compare profiles.
- **Analytics & Reports**: Visual charts and deep insights covering productivity and financial health.

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **State Management**: Zustand (modular slices)
- **Backend & Database**: Supabase (PostgreSQL), Row-Level Security (RLS), Realtime WebSockets
- **Icons**: Lucide React
- **Charting**: Recharts
- **Date Utilities**: date-fns

## 🏗 Architecture

FocusForge is built around a decoupled frontend-backend architecture:
- **Client**: A purely static React SPA hosted on Vercel/Netlify.
- **Server**: Supabase handles all database queries, auth, and realtime events via a RESTful PostgREST API.
- **State**: Centralized in Zustand, split into logical domains (`authSlice`, `focusSlice`, `financeSlice`, etc.) with automated syncing to Supabase.
- **Database**: Strictly typed PostgreSQL tables enforced by secure Row-Level Security policies.

## 📸 Screenshots

*(Replace with actual image URLs)*
![Dashboard Placeholder](https://via.placeholder.com/800x400.png?text=FocusForge+Dashboard)
![Focus Timer Placeholder](https://via.placeholder.com/800x400.png?text=Focus+Timer)
![Arena Leaderboard Placeholder](https://via.placeholder.com/800x400.png?text=Arena+Leaderboard)

## 📦 Installation & Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/focusforge.git
   cd focusforge
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add the following keys:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

## 🚀 Deployment

Refer to [DEPLOYMENT.md](./DEPLOYMENT.md) for full instructions on deploying the Supabase backend and Vercel frontend.

## 📁 Folder Structure

```
src/
├── components/     # Reusable UI components (modals, buttons, layout)
├── hooks/          # Custom React hooks (Supabase fetching, timers, logic)
├── lib/            # Utility functions (supabase client, exports, events)
├── pages/          # Top-level route components (Dashboard, Finance, etc.)
├── services/       # Encapsulated API calls (arena, friend, activity)
├── store/          # Zustand global state (slices, storeUtils)
└── types/          # Global TypeScript interfaces
supabase/
└── migrations/     # SQL migration files defining schema and RLS
```

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
