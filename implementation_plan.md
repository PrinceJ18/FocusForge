# Phase D1.4 — Dashboard Customization

Add a side drawer that lets users show/hide dashboard widgets, with preferences persisted via the existing `UserPreferences` store.

> [!IMPORTANT]
> **UI-only feature.** Leverages the existing `dashboard_hidden_widgets` preference field. No new database tables, no store logic changes, no drag-and-drop.

## Architecture Decision

The store already has `dashboard_hidden_widgets: string` in `UserPreferences` (line 115 of useStore.ts), defaulting to `''`. This field will store a comma-separated list of hidden widget IDs (e.g. `"upcomingBills,insights,savings"`). This avoids adding new state, new tables, or changing the store shape.

The existing `updatePreferencesLocal` + Supabase upsert pattern from Settings.tsx will be reused.

---

## Proposed Changes

### Customization Drawer Component

#### [NEW] [DashboardCustomizeDrawer.tsx](file:///d:/SWE%20Project/FocusForge%20Ad/src/components/dashboard/DashboardCustomizeDrawer.tsx)

A slide-in side drawer with:
- **Grouped widget list** by category (Overview, Productivity, Finance, Analytics, Insights)
- Each widget row: icon + name + description + toggle switch
- **Reset Dashboard** button restores defaults
- Backdrop overlay + smooth slide animation
- Responsive (full-height on desktop, full-width on mobile)

**Widget Registry** (defined as a constant array):

| ID | Name | Description | Category |
|---|---|---|---|
| `hero` | Welcome | Greeting and level info | Overview |
| `kpiMetrics` | Key Metrics | Level, Streak, Scores | Overview |
| `snapshot` | Today's Snapshot | Focus, Tasks, Expenses, Budget | Overview |
| `quickActions` | Quick Actions | Command center shortcuts | Overview |
| `todaysTasks` | Today's Tasks | Task list for today | Productivity |
| `upcomingBills` | Upcoming Bills | Recurring payment schedule | Finance |
| `focusTrend` | Focus Trend | 7-day focus chart | Analytics |
| `expenseTrend` | Expense Trend | 7-day expense chart | Analytics |
| `aiInsights` | AI Insights | Smart recommendations | Insights |
| `recentActivity` | Recent Activity | Event timeline | Insights |
| `savings` | Savings Progress | Savings goal tracker | Finance |

---

### Dashboard Integration

#### [MODIFY] [Dashboard.tsx](file:///d:/SWE%20Project/FocusForge%20Ad/src/pages/Dashboard.tsx)

Changes:
1. **Add "Customize" button** to the hero widget's header area (SlidersHorizontal icon)
2. **Add drawer state** (`showCustomize` boolean)
3. **Parse `dashboard_hidden_widgets`** into a `Set<string>` for O(1) lookups
4. **Wrap each widget section** in conditional rendering: `{!hiddenWidgets.has('id') && (<Widget />)}`
5. **Create a `handleToggleWidget` function** that updates `dashboard_hidden_widgets` both locally and to Supabase
6. **Import and render** `DashboardCustomizeDrawer`

> [!NOTE]
> The Hero banner (`hero`) and Key Metrics (`kpiMetrics`) will appear in the toggle list but are **visible by default**. Users CAN hide them. Today's Snapshot, Quick Actions, and all other widgets are similarly togglable.

---

### CSS Additions

#### [MODIFY] [index.css](file:///d:/SWE%20Project/FocusForge%20Ad/src/index.css)

New styles:
- `.customize-drawer` — fixed right-side panel with glassmorphism
- `.customize-drawer--open` — slide-in transform
- `.customize-backdrop` — overlay with fade
- `.customize-toggle` — styled toggle switch
- `.customize-widget-row` — icon + name + description + toggle layout
- `.customize-section-label` — category group heading
- Widget fade/collapse transitions (`opacity` + `max-height`)

---

## What Does NOT Change

- ❌ Store interface — reuses existing `dashboard_hidden_widgets` field
- ❌ Supabase schema — uses existing `user_preferences` table
- ❌ Settings page — not modified
- ❌ Navigation, analytics, reports, rewards, XP system
- ❌ No drag-and-drop

---

## Verification Plan

### Automated Tests
```bash
npm run typecheck
npm run build
```

### Manual Verification
- Customize button appears in dashboard hero
- Clicking opens a side drawer
- All 11 widgets listed with correct icons and descriptions
- Toggling a widget immediately hides/shows it
- Preferences persist across page refreshes (localStorage)
- Reset button restores all widgets to visible
- Drawer works on desktop, tablet, mobile
- No layout jumping when widgets are hidden
