import { StateCreator } from 'zustand';
import { AppState, FocusSlice } from './types';

export const createFocusSlice: StateCreator<AppState, [], [], FocusSlice> = (set, get) => ({
  focusSessions: [],
  timerSeconds: 25 * 60,
  timerRunning: false,
  timerMode: 'focus',
  pomodoroMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  sessionCount: 0,
  timerDeadline: null,
  lastCompletedDeadline: null,
  timerRunDurationSeconds: null,
  timerOwnerId: null,
  userTimerStates: {},
  
  setFocusSessions: (focusSessions) => set({ focusSessions }),
  addFocusSessionLocal: (session) =>
    set((s) => ({ focusSessions: [session, ...s.focusSessions] })),
  updateFocusSessionLocal: (id, updates) =>
    set((s) => ({
      focusSessions: s.focusSessions.map((fs) =>
        fs.id === id ? { ...fs, ...updates } : fs
      ),
    })),
  upsertFocusSessionLocal: (session) => set((s) => {
    const index = s.focusSessions.findIndex(
      (fs) => fs.id === session.id || fs.session_date === session.session_date
    );
    if (index >= 0) {
      const next = [...s.focusSessions];
      next[index] = session;
      return { focusSessions: next };
    } else {
      return { focusSessions: [session, ...s.focusSessions] };
    }
  }),
  
  setTimerSeconds: (timerSeconds) => get().updateActiveUserTimerState({ timerSeconds }),
  setTimerRunning: (timerRunning) => get().updateActiveUserTimerState({ timerRunning }),
  setTimerMode: (timerMode) => get().updateActiveUserTimerState({ timerMode }),
  setPomodoroMinutes: (pomodoroMinutes) => {
    const clamped = isNaN(pomodoroMinutes) || pomodoroMinutes <= 0 ? 25 : Math.max(1, Math.min(120, pomodoroMinutes));
    set({ pomodoroMinutes: clamped });
  },
  incrementSessionCount: () => set((s) => ({ sessionCount: s.sessionCount + 1 })),
  resetTimer: () => {
    const { timerMode, pomodoroMinutes, breakMinutes, longBreakMinutes } = get();
    const seconds =
      timerMode === 'focus'
        ? pomodoroMinutes * 60
        : timerMode === 'break'
          ? breakMinutes * 60
          : longBreakMinutes * 60;
    get().updateActiveUserTimerState({ 
      timerSeconds: seconds, 
      timerRunning: false, 
      timerDeadline: null, 
      timerRunDurationSeconds: null 
    });
  },
  updateActiveUserTimerState: (updates) => {
    const { timerSeconds, timerRunning, timerMode, timerDeadline, lastCompletedDeadline, timerRunDurationSeconds, timerOwnerId, userTimerStates } = get();
    const ownerKey = timerOwnerId || 'anonymous';
    const nextActive = {
      timerSeconds: updates.timerSeconds !== undefined ? updates.timerSeconds : timerSeconds,
      timerRunning: updates.timerRunning !== undefined ? updates.timerRunning : timerRunning,
      timerMode: updates.timerMode !== undefined ? updates.timerMode : timerMode,
      timerDeadline: updates.timerDeadline !== undefined ? updates.timerDeadline : timerDeadline,
      lastCompletedDeadline: updates.lastCompletedDeadline !== undefined ? updates.lastCompletedDeadline : lastCompletedDeadline,
      timerRunDurationSeconds: updates.timerRunDurationSeconds !== undefined ? updates.timerRunDurationSeconds : timerRunDurationSeconds,
    };
    set({
      ...nextActive,
      userTimerStates: {
        ...userTimerStates,
        [ownerKey]: nextActive
      }
    });
  },
  syncUserTimerState: (userId) => {
    const key = userId || 'anonymous';
    const { timerSeconds, timerRunning, timerMode, timerDeadline, lastCompletedDeadline, timerRunDurationSeconds, userTimerStates, pomodoroMinutes } = get();
    const prevOwner = get().timerOwnerId || 'anonymous';
    const nextStates = {
      ...userTimerStates,
      [prevOwner]: {
        timerSeconds,
        timerRunning,
        timerMode,
        timerDeadline,
        lastCompletedDeadline,
        timerRunDurationSeconds
      }
    };
    const targetState = nextStates[key] || {
      timerSeconds: pomodoroMinutes * 60,
      timerRunning: false,
      timerMode: 'focus',
      timerDeadline: null,
      lastCompletedDeadline: null,
      timerRunDurationSeconds: null
    };
    set({
      timerSeconds: targetState.timerSeconds,
      timerRunning: targetState.timerRunning,
      timerMode: targetState.timerMode,
      timerDeadline: targetState.timerDeadline,
      lastCompletedDeadline: targetState.lastCompletedDeadline,
      timerRunDurationSeconds: targetState.timerRunDurationSeconds,
      timerOwnerId: key,
      userTimerStates: nextStates
    });
  },
});
