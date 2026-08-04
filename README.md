# ⚡ FocusForge

<div align="center">

### **Forge Better Habits. Master Your Productivity. Control Your Finances.**

*A modern productivity and personal finance platform that combines task management, Pomodoro focus sessions, budgeting, analytics, gamification, and social accountability into one seamless experience.*

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-Latest-purple?logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38BDF8?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?logo=postgresql)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

# 📖 Overview

FocusForge is a **next-generation productivity and finance management platform** designed to help students and professionals build discipline, improve focus, manage expenses, and track personal growth.

Instead of using multiple applications for productivity, budgeting, focus sessions, reports, and habit tracking, FocusForge integrates everything into one intelligent dashboard.

The platform combines:

- 🎯 Productivity Management
- ⏱ Focus Sessions (Pomodoro)
- 💰 Personal Finance
- 📊 Advanced Analytics
- 🏆 Gamification
- 👥 Friends & Community
- ⚔ Productivity Arena
- 📈 Progress Reports

into one seamless experience.

---

# ✨ Key Features

## 🏠 Dashboard

- Personalized overview
- Daily productivity summary
- Budget snapshot
- Today's tasks
- Recent achievements
- Quick actions
- Focus statistics
- Financial insights

---

## ⏱ Focus Management

- Advanced Pomodoro Timer
- Custom work & break durations
- Task-linked focus sessions
- Focus history
- Session analytics
- Daily & monthly statistics
- XP rewards

---

## ✅ Smart Task Management

- Custom Sections
- Priority Levels
- Recurring Tasks
- Daily / Weekly / Monthly scheduling
- Reminders
- Calendar scheduling
- Task descriptions
- "Won't Do" status
- Progress tracking
- Productivity scoring

---

## 💰 Personal Finance

- Monthly Budget Management
- Expense Tracking
- Category Management
- Savings Goals
- Financial Analytics
- Budget Monitoring
- Spending Trends
- Recurring Expenses

---

## 📊 Analytics

Visual dashboards including:

- Productivity Trends
- Focus Statistics
- Financial Overview
- Budget Analysis
- XP Progress
- Task Completion
- Weekly Reports
- Monthly Reports

---

## 🏆 Achievement System

- XP System
- Level Progression
- Badges
- Daily Challenges
- Achievement Center
- Progress Tracking

---

## 👥 Friends & Community

- Unique Friend Codes
- Friend Requests
- Friend Profiles
- Productivity Comparison
- Community Network

---

## ⚔ Productivity Arena

Compete with friends through gamified productivity.

Features include:

- Weekly Leaderboards
- Monthly Leaderboards
- Arena Rankings
- Hall of Fame
- Activity Feed
- Champion Archive
- Live Score Updates
- Real-time Competition

---

## 📈 Performance Reports

- Weekly Reports
- Monthly Reports
- Productivity Summary
- Financial Summary
- Focus Insights
- Progress History

---

# 🎮 Gamification

FocusForge motivates users through:

- XP Rewards
- Level System
- Achievement Badges
- Daily Challenges
- Productivity Arena
- Leaderboards
- Champion Titles
- Hall of Fame

---

# 🛠 Tech Stack

## Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React
- Recharts
- Framer Motion

---

## Backend

- Supabase
- PostgreSQL
- Authentication
- Row Level Security (RLS)
- Realtime Database
- Storage
- PostgREST API

---

## State Management

- Zustand
- Modular Store Architecture

---

## Development

- ESLint
- TypeScript
- npm
- Git
- GitHub

---

# 🏗 Architecture

```
                ┌────────────────────┐
                │    React Frontend  │
                └──────────┬─────────┘
                           │
                    Zustand Store
                           │
                 Business Logic Layer
                           │
                  Supabase Client API
                           │
        ┌──────────────────┼─────────────────┐
        │                  │                 │
 Authentication      PostgreSQL DB      Realtime
        │                  │                 │
        └──────────────────┴─────────────────┘
```

---

# 📂 Project Structure

```
FocusForge/

├── src/
│
├── components/
│
├── pages/
│
├── services/
│
├── hooks/
│
├── store/
│
├── lib/
│
├── types/
│
├── assets/
│
└── styles/
│
├── supabase/
│   └── migrations/
│
├── public/
│
└── docs/
```

---

# 🚀 Installation

Clone the repository

```bash
git clone https://github.com/yourusername/focusforge.git
```

Go into the project

```bash
cd focusforge
```

Install dependencies

```bash
npm install
```

Create a `.env` file

```env
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Run the development server

```bash
npm run dev
```

Build for production

```bash
npm run build
```

---

# 📦 Deployment

Frontend

- Vercel

Backend

- Supabase

Database

- PostgreSQL

Refer to **DEPLOYMENT.md** for the complete deployment guide.

---

# 📸 Screenshots

> Replace these placeholders with actual screenshots after deployment.

| Dashboard | Finance |
|------------|---------|
| Dashboard Screenshot | Finance Screenshot |

| Focus | Analytics |
|--------|-----------|
| Focus Timer | Analytics Dashboard |

| Arena | Friends |
|--------|-----------|
| Productivity Arena | Friends System |

---

# 🔒 Security

FocusForge follows modern backend security practices.

- Supabase Authentication
- Row Level Security (RLS)
- Protected Database Policies
- Secure API Access
- Type-safe Backend Integration

---

# 📈 Current Status

### Version

**v1.0.0 Release Candidate**

### Project Status

✅ Authentication

✅ Dashboard

✅ Finance Management

✅ Focus Timer

✅ Task Management

✅ Analytics

✅ Friends System

✅ Productivity Arena

✅ Achievement System

✅ Performance Reports

✅ Settings

---

# 🎯 Future Roadmap

- 🤖 AI Productivity Coach
- 📱 Progressive Web App (PWA)
- 🔔 Push Notifications
- 📅 Google Calendar Integration
- ☁ Cloud Backup & Sync
- 📤 Data Export
- 🌍 Public Productivity Challenges
- 👨‍🎓 Study Groups
- 📊 AI Insights
- 📈 Predictive Productivity Analytics

---

# 🤝 Contributing

Contributions are welcome!

Feel free to fork the repository, create a feature branch, and submit a pull request.

---

# 📄 License

This project is licensed under the **MIT License**.

---

# 👨‍💻 Developer

**Prince Jain**

B.Tech Computer Science & Engineering (Data Science)

FocusForge was developed as a full-stack portfolio project demonstrating modern web development, cloud backend integration, productivity systems, financial management, gamification, and scalable application architecture.

---

<div align="center">

### ⭐ If you like this project, consider giving it a Star!

**Made with ❤️ using React, TypeScript & Supabase**

</div>
