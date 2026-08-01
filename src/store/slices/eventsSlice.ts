import { StateCreator } from 'zustand';
import { AppState, EventsSlice } from './types';

export const createEventsSlice: StateCreator<AppState, [], [], EventsSlice> = (set) => ({
  notifications: [],
  events: [],
  
  showNotification: (notification) => {
    const id = crypto.randomUUID();
    set((s) => ({
      notifications: [...s.notifications, { ...notification, id }].slice(-5),
    }));
  },
  
  dismissNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
    
  setEvents: (events) => set({ events }),
  
  addEventLocal: (event) => set((s) => ({ events: [event, ...s.events] })),
});
