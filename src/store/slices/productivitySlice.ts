import { StateCreator } from 'zustand';
import { AppState, ProductivitySlice } from './types';

export const createProductivitySlice: StateCreator<AppState, [], [], ProductivitySlice> = (set) => ({
  tasks: [],
  taskSections: [],
  taskCompletions: [],
  
  setTasks: (tasks) => set({ tasks }),
  setTaskSections: (taskSections) => set({ taskSections }),
  setTaskCompletions: (taskCompletions) => set({ taskCompletions }),
  
  addTaskLocal: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
  updateTaskLocal: (id, updates) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),
  removeTaskLocal: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  
  addTaskSectionLocal: (section) => set((s) => ({ taskSections: [...s.taskSections, section] })),
  updateTaskSectionLocal: (id, updates) =>
    set((s) => ({ taskSections: s.taskSections.map((ts) => ts.id === id ? { ...ts, ...updates } : ts) })),
  removeTaskSectionLocal: (id) => set((s) => ({ taskSections: s.taskSections.filter((ts) => ts.id !== id) })),
  
  addTaskCompletionLocal: (completion) => set((s) => ({ taskCompletions: [...s.taskCompletions, completion] })),
  removeTaskCompletionLocal: (taskId, occurrenceDate) =>
    set((s) => ({
      taskCompletions: s.taskCompletions.filter(
        (c) => !(c.task_id === taskId && c.occurrence_date === occurrenceDate)
      ),
    })),
});
