import { StateCreator } from 'zustand';
import { AppState, NavigationSlice, GlobalSlice, LifetimeAggregates } from './types';

/**
 * Default lifetime aggregates — safe zero values for new/unauthenticated users.
 * These will be overwritten by RPC results during loadUserData().
 */
export const defaultLifetimeAggregates: LifetimeAggregates = {
  lifetimeFocusMinutes: 0,
  lifetimeFocusSessions: 0,
  lifetimeCompletedTasks: 0,
  availableMonths: [],
};

export const createNavigationSlice: StateCreator<AppState, [], [], NavigationSlice & GlobalSlice> = (set) => ({
  currentPage: 'dashboard',
  setPage: (page) => set({ currentPage: page }),
  
  dataLoaded: false,
  setDataLoaded: (dataLoaded) => set({ dataLoaded }),

  lifetimeAggregates: { ...defaultLifetimeAggregates },
  setLifetimeAggregates: (aggregates) =>
    set((state) => ({
      lifetimeAggregates: { ...state.lifetimeAggregates, ...aggregates },
    })),
});
