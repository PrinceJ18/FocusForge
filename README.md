<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Supabase-BaaS-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Zustand-5.0-FFD700?style=for-the-badge" alt="Zustand" />
</p>

<h1 align="center">⚡ FocusForge</h1>

<p align="center">
  <strong>A gamified productivity & finance tracker built for students</strong>
</p>

<p align="center">
  FocusForge helps students track productivity, manage expenses, build consistency, and improve focus through a beautiful, gamified dashboard with XP, streaks, badges, and daily challenges.
</p>

---

## ✨ Features

### 🧠 Focus & Productivity
- **Pomodoro Timer** — Customizable focus/break/long-break intervals with a beautiful circular progress ring
- **Persistent Timer** — Timer runs globally across page navigations (powered by a custom `useTimerEngine` hook)
- **Focus Session Tracking** — Automatic daily session logging with minutes & session count aggregation
- **Task Management** — Create, complete, and delete tasks with priority levels (low / medium / high), subjects, and deadlines
- **XP on Completion** — Earn XP for completing focus sessions (5–30 XP based on duration) and tasks (5–20 XP based on priority)

### 💰 Finance Management
- **Expense Tracking** — Log daily expenses with titles, amounts, categories, notes, and dates
- **Budget Dashboard** — Set a monthly budget and monitor spending with real-time progress bars
- **Category Breakdown** — View spending by category with interactive pie charts and daily spending line charts
- **Custom Categories** — Create your own expense categories with custom colors and icons
- **Savings Goals** — Set savings goals with target amounts, deadlines, and visual progress tracking

### 📊 Analytics
- **Unified Dashboard** — Dual-axis area charts combining daily spending and focus trends
- **Period Filters** — Toggle between Today, 30-day, and 90-day views
- **Category Pie Charts** — Visual spending distribution across all categories
- **Focus vs. Spending Scatter** — Correlation analysis between productivity and spending patterns
- **Weekly Focus Bars** — Week-over-week focus time comparison

### 🏆 Gamification & Rewards
- **XP & Leveling System** — Progress through 7 levels: Starter → Beginner → Focused → Achiever → Expert → Master → Legend
- **Streak System** — Calendar-day-based streak tracking with automatic reset logic
- **12 Unlockable Badges** — Earn badges for focus milestones, task completion, streak achievements, XP thresholds, budget discipline, and savings goals
- **Daily Challenges** — 4 rotating daily challenges with XP rewards and claim tracking
- **Achievement Notifications** — Animated toast notifications for XP gains, level-ups, and badge unlocks

### 💸 Expense Buddy (Splits)
- **Quick Split Calculator** — Instantly divide any bill amount by number of people
- **Owe / Owed Tracking** — Track who owes you and who you owe with net balance calculation
- **Settle Up** — Mark splits as settled with a single click

### 🔐 Authentication
- **Supabase Auth** — Email/password and Google OAuth sign-in
- **Profile Management** — Display name and avatar with automatic profile creation on first login
- **Row-Level Security** — Every user can only access their own data

### 🎨 Design & UX
- **Dark Mode UI** — Premium dark theme with glassmorphism cards and ambient gradient orbs
- **Responsive Design** — Full mobile support with collapsible sidebar and bottom navigation
- **Micro-Animations** — Framer Motion powered page transitions and interactive elements
- **Modern Typography** — Inter + Space Grotesk font stack via Google Fonts

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [React 18](https://react.dev) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite 5](https://vitejs.dev/) |
| **Styling** | [TailwindCSS 3](https://tailwindcss.com/) + Vanilla CSS |
| **State Management** | [Zustand 5](https://zustand-demo.pmnd.rs/) (persisted to localStorage) |
| **Backend / Database** | [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Date Utilities** | [date-fns](https://date-fns.org/) |

---

## 📁 Project Structure

```
FocusForge/
├── index.html                  # App entry point with Google Fonts preload
├── package.json                # Dependencies & scripts
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind theme configuration
├── postcss.config.js           # PostCSS plugins
├── tsconfig.json               # TypeScript project references
├── tsconfig.app.json           # App-level TS config
├── tsconfig.node.json          # Node-level TS config
│
├── src/
│   ├── main.tsx                # React DOM entry
│   ├── App.tsx                 # Root component (auth, routing, timer engine)
│   ├── index.css               # Global styles, CSS variables, glassmorphism
│   ├── vite-env.d.ts           # Vite type declarations
│   │
│   ├── components/
│   │   ├── Header.tsx          # Top bar with page title & profile
│   │   ├── Sidebar.tsx         # Desktop navigation sidebar
│   │   ├── MobileNav.tsx       # Bottom mobile navigation bar
│   │   ├── AuthModal.tsx       # Email/Google sign-in modal
│   │   ├── ProfileModal.tsx    # User profile editor
│   │   ├── AchievementNotification.tsx  # Global toast for XP/level/badge
│   │   └── XPNotification.tsx  # XP gain toast
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx       # Overview: stats, charts, quick actions
│   │   ├── Finance.tsx         # Expenses, budget, savings goals, categories
│   │   ├── Productivity.tsx    # Pomodoro timer & task manager
│   │   ├── Analytics.tsx       # Charts & trend analysis
│   │   ├── Rewards.tsx         # XP, levels, badges, daily challenges
│   │   ├── Splits.tsx          # Expense splitting (Expense Buddy)
│   │   └── AuthScreen.tsx      # Landing / sign-in page
│   │
│   ├── store/
│   │   └── useStore.ts         # Zustand global store + Supabase data loader
│   │
│   ├── hooks/
│   │   └── useTimerEngine.ts   # Global Pomodoro interval (persistent)
│   │
│   └── lib/
│       ├── supabase.ts         # Supabase client & DB type definitions
│       ├── levels.ts           # Level/title/color calculation from XP
│       ├── statsUtils.ts       # Centralized stats, badge logic, streak calc
│       └── formatCurrency.ts   # Currency formatting utility
│
└── supabase/
    └── migrations/
        └── 20260525174459_create_spendwise_tables.sql  # Full DB schema + RLS
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x (or yarn / pnpm)
- A **[Supabase](https://supabase.com/)** project (free tier works)

### 1. Clone the Repository

```bash
git clone https://github.com/PrinceJ18/FocusForge.git
cd FocusForge
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com/)
2. Navigate to **SQL Editor** and run the migration file:
   ```
   supabase/migrations/20260525174459_create_spendwise_tables.sql
   ```
   This creates all required tables (`profiles`, `expenses`, `tasks`, `focus_sessions`, `savings_goals`, `custom_categories`) with Row-Level Security policies and performance indexes.

3. Enable **Google OAuth** (optional) under **Authentication → Providers → Google**

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> 🔑 Find these values in your Supabase project: **Settings → API**

### 5. Start the Development Server

```bash
npm run dev
```

The app will be available at **http://localhost:5173**

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Build for production (outputs to `dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the project |
| `npm run typecheck` | Run TypeScript type checking (no emit) |

---

## 🗄️ Database Schema

FocusForge uses **6 Supabase tables**, all protected by Row-Level Security:

| Table | Purpose |
|-------|---------|
| `profiles` | User profile, XP, streak, badges, monthly budget |
| `expenses` | Individual expense entries with category & date |
| `tasks` | Task management with priority, deadline, completion |
| `focus_sessions` | Daily Pomodoro session logs (minutes + count) |
| `savings_goals` | Savings targets with progress tracking |
| `custom_categories` | User-defined expense categories |

All tables enforce **user-scoped access** — authenticated users can only read, write, update, and delete their own rows.

---

## 🏅 Badge System

| Badge | Requirement |
|-------|-------------|
| 🎯 First Focus | Complete your first focus session |
| 🧠 Focus Master | Complete 10 focus sessions |
| 🔥 Consistent | Maintain a 3-day streak |
| ⚡ Week Warrior | Maintain a 7-day streak |
| 💪 Unstoppable | Achieve a 30-day streak |
| ⭐ Rising Star | Earn 100 XP |
| 🏆 Champion | Earn 500 XP |
| 👑 Legend | Earn 1,000 XP |
| ✅ Task Crusher | Complete 10 tasks |
| 🚀 Productivity Pro | Complete 50 tasks |
| 💰 Budget Keeper | Stay within budget for a month |
| 🐷 Saver | Create your first savings goal |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit** your changes with clear messages:
   ```bash
   git commit -m "feat: add weekly focus summary chart"
   ```
4. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request** describing your changes

### Guidelines
- Follow existing code style and TypeScript conventions
- Avoid using `any` types where possible
- Preserve existing comments and docstrings
- Ensure `npm run build` and `npm run typecheck` pass before submitting

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/PrinceJ18">PrinceJ18</a>
</p>
