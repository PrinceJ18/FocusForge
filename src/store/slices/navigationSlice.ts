import { StateCreator } from 'zustand';
import { AppState, NavigationSlice, GlobalSlice } from './types';

export const createNavigationSlice: StateCreator<AppState, [], [], NavigationSlice & GlobalSlice> = (set) => ({
  currentPage: 'dashboard',
  setPage: (page) => set({ currentPage: page }),
  
  dataLoaded: false,
  setDataLoaded: (dataLoaded) => set({ dataLoaded }),
});
