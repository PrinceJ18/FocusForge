# Productivity Arena — Architectural & Engineering Specification

> **FocusForge AI Operating System (FAIOS)**  
> **Module**: Productivity Arena  
> **Version**: 1.0 (Production Ready)  
> **Status**: Verified & Deployed

---

## 1. Overview & Business Intent

The **Productivity Arena** is a gamified, social competition hub built into FocusForge. It turns daily focus sessions, completed tasks, and streak consistency into a normalized competitive score (0–100 pts) that allows users to compete in weekly and monthly leagues with friends & global peers.

---

## 2. System Architecture

The module is designed using **Clean Architecture** principles, ensuring that business logic is completely decoupled from UI rendering, database schemas, and state management.

```
   ┌─────────────────────────────────────────────────────────────┐
   │                        UI Layer                             │
   │   (Arena.tsx, ArenaActivity.tsx, ArenaHallOfFame.tsx)       │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
   ┌──────────────────────────────▼──────────────────────────────┐
   │                     Hooks & Store Layer                     │
   │      (useArena, useLeaderboard, useActivityFeed, useStore)  │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
   ┌──────────────────────────────▼──────────────────────────────┐
   │                   Pure Engine Core Layer                    │
   │    (arenaScoreEngine, leaderboardEngine, rankEngine, etc.) │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
   ┌──────────────────────────────▼──────────────────────────────┐
   │                     Service Abstraction                     │
   │     (arenaService, leaderboardService, hallOfFameService)   │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
   ┌──────────────────────────────▼──────────────────────────────┐
   │                     Supabase Database                       │
   │ (arenas, arena_scores, hall_of_fame, arena_activity, friends)│
   └─────────────────────────────────────────────────────────────┘
```

---

## 3. Pure Score Engine (`src/lib/arena/`)

All scoring logic is encapsulated in 100% pure TypeScript functions inside `src/lib/arena/`. No UI component or API call calculates Arena Scores independently.

### Scoring Formula (`arenaScoreEngine.ts`)

$$\text{Arena Score} = \min\Big(100, \, \text{Round}\big(0.45 \cdot S_{\text{prod}} + 0.25 \cdot S_{\text{focus}} + 0.20 \cdot S_{\text{tasks}} + 0.10 \cdot S_{\text{challenge}}\big)\Big)$$

- **Productivity Score (45%)**: Direct map from daily productivity engine (0–100).
- **Focus Time (25%)**: $S_{\text{focus}} = \min\big(100, \frac{\text{focusMinutes}}{120} \times 100\big)$ (target: 2 hours/day).
- **Task Completion (20%)**: $S_{\text{tasks}} = \min\big(100, \frac{\text{tasksCompleted}}{5} \times 100\big)$ (target: 5 tasks/day).
- **Daily Challenge (10%)**: 10 points awarded upon completing the daily challenge.

### Pure Engine Files
1. `arenaScoreEngine.ts`: Calculates normalized score (0–100) and formula breakdowns.
2. `leaderboardEngine.ts`: Stable sorting with tie-breaking logic (Score → Level → Streak → Timestamp).
3. `rankEngine.ts`: Position calculation and distance-to-next-rank gap analysis.
4. `percentileEngine.ts`: Edge-case safe top percentile calculator (`Top X%`).
5. `championEngine.ts`: Winner detection and historical winning streak calculator.
6. `personalBestEngine.ts`: Historical personal record detector.
7. `weeklyReset.ts`: Weekly snapshot creator for weekly resets (Sundays at 23:59:59).
8. `monthlyReset.ts`: Monthly snapshot creator for monthly resets (Last day of month).
9. `celebrationManager.ts`: Detects personal best, rank movement, and champion triggers.
10. `celebrationQueue.ts`: Sequential priority queue (`Champion` → `Personal Best` → `Rank Up` → `Badge`) ensuring non-overlapping celebration popups.

---

## 4. Database Schema & Security (Supabase RLS)

### Tables
1. **`arenas`**: Arenas registry (`visibility`: `'public' | 'private'`).
2. **`arena_members`**: Arena memberships with soft deletes (`deleted_at`).
3. **`arena_scores`**: Calculated user scores per period (`weekly` or `monthly`).
4. **`hall_of_fame`**: Historical league winner snapshots (`period_type`, `period_start`, `score_achieved`).
5. **`arena_activity`**: Public activity log (level ups, badges, personal bests, daily challenges). Strictly zero private task names, expenses, budgets, or notes.
6. **`friends` & `friend_requests`**: Bi-directional friend relationships with `friend_code` auto-trigger generation.

### Privacy Guarantees
- Row Level Security (RLS) policies enforce that users can only modify their own profile data.
- Public activity feeds sanitize metadata dynamically, excluding all personal data.
- Soft-deleted members/friendships (`deleted_at IS NOT NULL`) are filtered out automatically.

---

## 5. Component Hierarchy (`src/components/arena/`)

- **`ArenaHeader.tsx`**: Multi-arena selector dropdown and header title.
- **`PeriodToggleCountdown.tsx`**: Weekly / Monthly segmented toggle with live countdown timer.
- **`TopThreePodium.tsx`**: Gold (#1), Silver (#2), and Bronze (#3) staggered podium cards.
- **`LeaderboardTable.tsx`**: Participant rankings table with live activity status.
- **`YourPositionCard.tsx`**: Personal position breakdown, gap to next rank, and top percentile badge.
- **`WeeklyProgressCard.tsx`**: Target goal progress bar with Score Breakdown trigger.
- **`WeeklyChampionCard.tsx`**: Spotlight card celebrating the current league champion.
- **`FriendActivityPreview.tsx`**: Public activity feed preview (links to `/arena-activity`).
- **`HallOfFamePreview.tsx`**: Historical champion preview (links to `/arena-hall-of-fame`).
- **`PersonalBestModal.tsx`**: Confetti burst celebration for breaking personal records.
- **`RankUpModal.tsx`**: Climbing badge celebration for position improvements.
- **`ChampionModal.tsx`**: Spotlight modal for #1 Weekly Champions.
- **`ArenaScoreBreakdown.tsx`**: Formula contribution modal explaining 45/25/20/10 scoring weights.

---

## 6. Verification & Quality Standards

- **TypeScript**: Strictly typed interfaces for `ArenaScore`, `ArenaActivity`, `HallOfFameEntry`, `FriendProfile`.
- **Performance**: All components wrapped in `React.memo` with `useMemo`/`useCallback` hooks.
- **Accessibility**: 44px+ touch targets, `focus-visible:ring-2`, ARIA labels, and `prefers-reduced-motion` guards.
