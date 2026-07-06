import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  Coffee, 
  Brain, 
  Settings as SettingsIcon, 
  X, 
  Clock, 
  Search, 
  List, 
  Calendar as CalendarIcon, 
  FolderPlus 
} from 'lucide-react';
import { useStore, Task } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { calculateTodayFocus, calculateTodaySessions } from '../lib/statistics';
import { logEvent } from '../lib/events';
import { getTasksForDate } from '../lib/taskRecurrence';

// Import New Modular Task Components
import TaskSectionManager from '../components/tasks/TaskSectionManager';
import TaskFormModal from '../components/tasks/TaskFormModal';
import TaskDetailsModal from '../components/tasks/TaskDetailsModal';
import TaskListView from '../components/tasks/TaskListView';
import TaskCalendarView from '../components/tasks/TaskCalendarView';
import { 
  createTask, 
  updateTask, 
  deleteTask, 
  completeTask, 
  uncompleteTask
} from '../store/useStore';

type Priority = 'low' | 'medium' | 'high';

const TIMER_MODES = [
  { id: 'focus', label: 'Focus', icon: <Brain size={14} />, color: '#a855f7' },
  { id: 'break', label: 'Short Break', icon: <Coffee size={14} />, color: '#10b981' },
  { id: 'longbreak', label: 'Long Break', icon: <Coffee size={14} />, color: '#06b6d4' },
];

const getTaskXP = (priority: string) => {
  if (priority === 'high') return 20;
  if (priority === 'medium') return 10;
  return 5;
};

export default function Productivity() {
  const {
    tasks, focusSessions, profile, user,
    timerSeconds, timerRunning, timerMode, pomodoroMinutes, breakMinutes, longBreakMinutes,
    setTimerSeconds, setTimerRunning, setTimerMode, setPomodoroMinutes,
    addTaskLocal, updateTaskLocal, removeTaskLocal, addXP: addXPLocal, taskCompletions, taskSections
  } = useStore();

  const [completedSession, setCompletedSession] = useState(false);

  const totalSeconds = timerMode === 'focus'
    ? pomodoroMinutes * 60
    : timerMode === 'break'
      ? breakMinutes * 60
      : longBreakMinutes * 60;

  const safeTimerSeconds =
    typeof timerSeconds === "number" && !isNaN(timerSeconds)
      ? timerSeconds
      : totalSeconds;

  const validTotalSeconds = typeof totalSeconds === 'number' && totalSeconds > 0 ? totalSeconds : 25 * 60;
  const clampedTimerSeconds = Math.max(0, Math.min(safeTimerSeconds, validTotalSeconds));
  const progress = ((validTotalSeconds - clampedTimerSeconds) / validTotalSeconds) * 100;
  
  const radius = window.innerWidth < 640 ? 105 : 140;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = Number.isFinite(progress) 
    ? circumference - (progress / 100) * circumference 
    : circumference;

  const todayMinutes = calculateTodayFocus(focusSessions);
  const todaySessionCount = calculateTodaySessions(focusSessions);

  // Task UI State
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | Priority>('all');
  const [filterSectionId, setFilterSectionId] = useState<string>('all');
  
  const [showAddTask, setShowAddTask] = useState(false);
  const [defaultDateForNewTask, setDefaultDateForNewTask] = useState<string | undefined>(undefined);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<{ task: Task; completed: boolean; date: string } | null>(null);
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [showTimerSettings, setShowTimerSettings] = useState(false);

  const handleStart = () => {
    const state = useStore.getState();
    const remaining = state.timerSeconds;
    const defaultMins = state.timerMode === 'focus' ? state.pomodoroMinutes : state.timerMode === 'break' ? state.breakMinutes : state.longBreakMinutes;
    const finalSeconds = remaining <= 0 ? defaultMins * 60 : remaining;
    
    // Capture original run duration if not already set (meaning we are starting fresh, not resuming)
    let runDuration = state.timerRunDurationSeconds;
    if (runDuration === null || runDuration === undefined) {
      runDuration = finalSeconds;
    }
    
    const deadline = Date.now() + finalSeconds * 1000;
    useStore.setState({ 
      timerDeadline: deadline,
      timerRunDurationSeconds: runDuration 
    });
    state.setTimerSeconds(finalSeconds);
    state.setTimerRunning(true);
  };

  const handlePause = () => {
    const state = useStore.getState();
    const deadline = state.timerDeadline;
    let remaining = state.timerSeconds;
    if (state.timerRunning && deadline) {
      remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    }
    useStore.setState({ timerDeadline: null });
    state.setTimerSeconds(remaining);
    state.setTimerRunning(false);
  };

  const handleReset = () => {
    const state = useStore.getState();
    const defaultMins = state.timerMode === 'focus' ? state.pomodoroMinutes : state.timerMode === 'break' ? state.breakMinutes : state.longBreakMinutes;
    const seconds = defaultMins * 60;
    useStore.setState({ 
      timerDeadline: null,
      timerRunDurationSeconds: null 
    });
    state.setTimerSeconds(seconds);
    state.setTimerRunning(false);
  };

  const switchMode = (mode: string) => {
    const state = useStore.getState();
    const targetMins = mode === 'focus' ? state.pomodoroMinutes : mode === 'break' ? state.breakMinutes : state.longBreakMinutes;
    const seconds = targetMins * 60;
    useStore.setState({ 
      timerDeadline: null,
      timerRunDurationSeconds: null 
    });
    state.setTimerMode(mode as any);
    state.setTimerSeconds(seconds);
    state.setTimerRunning(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const modeColor = timerMode === 'focus' ? '#a855f7' : timerMode === 'break' ? '#10b981' : '#06b6d4';

  // Task Actions
  const handleCreateTask = async (taskData: any) => {
    if (!user) {
      // Local fallback
      const newTask = {
        id: crypto.randomUUID(),
        user_id: 'local',
        ...taskData,
        completed: false,
        created_at: new Date().toISOString(),
        completed_at: null,
      };
      addTaskLocal(newTask);
      setShowAddTask(false);
      return;
    }
    await createTask(taskData, user.id);
    logEvent('task_created', 'tasks', crypto.randomUUID(), {
      title: taskData.title,
      description: `Created task: ${taskData.title}`,
    });
    setShowAddTask(false);
  };

  const handleUpdateTask = async (taskData: any) => {
    if (!editingTask) return;
    await updateTask(editingTask.id, taskData);
    logEvent('task_updated', 'tasks', editingTask.id, {
      title: taskData.title,
      description: `Updated task: ${taskData.title}`,
    });
    setEditingTask(null);
  };

  const handleDeleteTask = async (task: Task) => {
    await deleteTask(task.id);
    logEvent('task_deleted', 'tasks', task.id, {
      title: task.title,
      description: `Deleted task: ${task.title}`,
    });
  };

  const handleToggleTask = async (task: Task, currentlyCompleted: boolean, dateStr: string) => {
    const xpEarned = getTaskXP(task.priority);
    const date = parseISO(dateStr);

    if (currentlyCompleted) {
      // Uncomplete task
      await addXPLocal(-xpEarned);
      await uncompleteTask(task, date);
      
      // Sync xp_awarded field back
      if (!task.recurrence_type || task.recurrence_type === 'none') {
        updateTaskLocal(task.id, { xp_awarded: false });
        if (user) {
          await supabase.from('tasks').update({ xp_awarded: false }).eq('id', task.id);
        }
      }
    } else {
      // Complete task
      await completeTask(task, date, user?.id || 'local');
      
      const isRecurring = task.recurrence_type && task.recurrence_type !== 'none';
      if (isRecurring || !task.xp_awarded) {
        await addXPLocal(xpEarned);
        useStore.getState().showNotification({
          type: 'xp',
          title: `+${xpEarned} XP Earned`,
          message: `Task completed: ${task.title}`,
          xp: xpEarned,
        });

        if (!isRecurring) {
          updateTaskLocal(task.id, { xp_awarded: true });
          if (user) {
            await supabase.from('tasks').update({ xp_awarded: true }).eq('id', task.id);
          }
        }
      }

      logEvent('task_completed', 'tasks', task.id, {
        title: task.title,
        description: `Completed task: ${task.title}`,
      });
    }
  };

  // Pending count for today's summary
  const todayOccurrences = getTasksForDate(tasks, new Date(), taskCompletions);
  const todayPendingCount = todayOccurrences.filter((o) => !o.completed).length;

  return (
    <div className="page-enter space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Timer */}
        <div className="glass-card p-6 flex flex-col items-center">
          {/* Mode selector */}
          <div className="flex gap-1 p-1 rounded-xl mb-6 self-stretch" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {TIMER_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => switchMode(mode.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all"
                style={{
                  background: timerMode === mode.id ? `${mode.color}20` : 'transparent',
                  color: timerMode === mode.id ? mode.color : 'var(--text-muted)',
                  border: timerMode === mode.id ? `1px solid ${mode.color}40` : '1px solid transparent',
                  borderRadius: 10,
                }}
              >
                {mode.icon} {mode.label}
              </button>
            ))}
          </div>

          {/* Timer ring */}
          <div
            className="timer-ring mb-6 relative flex items-center justify-center mx-auto"
            style={{
              width: window.innerWidth < 640 ? 260 : 340,
              height: window.innerWidth < 640 ? 260 : 340,
            }}
          >
            <svg
              width={window.innerWidth < 640 ? 260 : 340}
              height={window.innerWidth < 640 ? 260 : 340}
              viewBox="0 0 340 340"
            >
              <defs>
                <linearGradient id="timerGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={modeColor} />
                  <stop
                    offset="100%"
                    stopColor={timerMode === 'focus' ? '#ec4899' : modeColor}
                  />
                </linearGradient>
              </defs>

              {/* Background ring */}
              <circle
                cx="170"
                cy="170"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="10"
              />

              {/* Progress ring */}
              <circle
                cx="170"
                cy="170"
                r={radius}
                fill="none"
                stroke="url(#timerGrad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition: 'stroke-dashoffset 1s linear',
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center',
                  filter: 'drop-shadow(0 0 12px rgba(168,85,247,0.7))',
                }}
              />

              {/* Glow effect */}
              {timerRunning && (
                <circle
                  cx="170"
                  cy="170"
                  r={radius}
                  fill="none"
                  stroke={modeColor}
                  strokeWidth="2"
                  strokeDasharray={`${circumference * 0.05} ${circumference * 0.95}`}
                  strokeDashoffset={strokeDashoffset}
                  opacity="0.4"
                  style={{
                    filter: 'blur(4px)',
                    transform: 'rotate(-90deg)',
                    transformOrigin: 'center',
                  }}
                />
              )}
            </svg>

            {/* Center content */}
            <div
              className="timer-display"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {completedSession ? (
                <div className="text-center">
                  <div className="text-3xl mb-1">🎉</div>
                  <p className="text-sm font-bold" style={{ color: '#a855f7' }}>
                    +10 XP!
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div
                    className="text-5xl sm:text-6xl font-black tracking-tight text-center"
                    style={{
                      color: 'white',
                      fontFamily: 'Space Grotesk',
                      lineHeight: 1,
                    }}
                  >
                    {formatTime(safeTimerSeconds)}
                  </div>

                  <div
                    className="mt-3 text-sm uppercase tracking-[0.25em]"
                    style={{
                      color: modeColor,
                      fontWeight: 700,
                    }}
                  >
                    {timerMode}
                  </div>

                  {timerRunning && (
                    <div
                      className="mt-2 text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Stay focused 🚀
                    </div>
                  )}

                  <p
                    className="text-xs text-center mt-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {timerMode === 'focus'
                      ? 'Focus Time'
                      : timerMode === 'break'
                        ? 'Short Break'
                        : 'Long Break'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Timer controls */}
          <div className="flex items-center justify-center gap-4 mt-8 flex-wrap">
            <button
              onClick={timerRunning ? handlePause : handleStart}
              className="flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: timerRunning
                  ? 'rgba(239,68,68,0.15)'
                  : 'linear-gradient(135deg, #a855f7, #ec4899)',
                border: timerRunning
                  ? '1px solid rgba(239,68,68,0.4)'
                  : '1px solid rgba(168,85,247,0.5)',
                boxShadow: timerRunning
                  ? '0 0 25px rgba(239,68,68,0.25)'
                  : '0 0 30px rgba(168,85,247,0.35)',
                color: 'white',
              }}
            >
              {timerRunning ? (
                <Pause size={30} />
              ) : (
                <Play size={30} style={{ marginLeft: 3 }} />
              )}
            </button>

            <button
              onClick={handleReset}
              className="flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                width: 58,
                height: 58,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'white',
                backdropFilter: 'blur(10px)',
              }}
            >
              <RotateCcw size={22} />
            </button>
            
            <button
              onClick={() => setShowTimerSettings(true)}
              className="flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                color: 'var(--text-muted)',
              }}
            >
              <SettingsIcon size={18} />
            </button>
          </div>

          {/* Premium productivity stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-6">
            {/* Sessions */}
            <div
              className="group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'linear-gradient(135deg, rgba(168,85,247,0.14), rgba(168,85,247,0.04))',
                border: '1px solid rgba(168,85,247,0.2)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 0 20px rgba(168,85,247,0.08)',
              }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'radial-gradient(circle at top right, rgba(168,85,247,0.18), transparent 60%)',
                }}
              />
              <div className="relative z-10 text-left">
                <div
                  className="text-3xl font-black"
                  style={{ color: '#a855f7', fontFamily: 'Space Grotesk' }}
                >
                  {todaySessionCount}
                </div>
                <div className="text-sm mt-1 tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Sessions Completed
                </div>
              </div>
            </div>

            {/* Today focus */}
            <div
              className="group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(16,185,129,0.04))',
                border: '1px solid rgba(16,185,129,0.2)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 0 20px rgba(16,185,129,0.08)',
              }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'radial-gradient(circle at top right, rgba(16,185,129,0.18), transparent 60%)',
                }}
              />
              <div className="relative z-10 text-left">
                <div
                  className="text-3xl font-black"
                  style={{ color: '#10b981', fontFamily: 'Space Grotesk' }}
                >
                  {todayMinutes}m
                </div>
                <div className="text-sm mt-1 tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Focus Today
                </div>
              </div>
            </div>

            {/* Streak */}
            <div
              className="group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(245,158,11,0.04))',
                border: '1px solid rgba(245,158,11,0.2)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 0 20px rgba(245,158,11,0.08)',
              }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'radial-gradient(circle at top right, rgba(245,158,11,0.18), transparent 60%)',
                }}
              />
              <div className="relative z-10 text-left">
                <div
                  className="text-3xl font-black"
                  style={{ color: '#f59e0b', fontFamily: 'Space Grotesk' }}
                >
                  {profile.streak}d
                </div>
                <div className="text-sm mt-1 tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Current Streak
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks Management Section */}
        <div className="glass-card p-5 flex flex-col gap-4">
          {/* Header & View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div className="text-left">
              <h3 className="font-bold text-lg text-white" style={{ fontFamily: 'Space Grotesk' }}>
                Tasks Board
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {todayPendingCount} tasks pending for today
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* View Switcher */}
              <div className="flex p-0.5 rounded-lg bg-white/5 border border-white/5">
                <button
                  onClick={() => setViewMode('list')}
                  className="px-2.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1"
                  style={{
                    background: viewMode === 'list' ? 'rgba(168,85,247,0.15)' : 'transparent',
                    color: viewMode === 'list' ? '#a855f7' : '#9ca3af',
                  }}
                >
                  <List size={13} /> List
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className="px-2.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1"
                  style={{
                    background: viewMode === 'calendar' ? 'rgba(168,85,247,0.15)' : 'transparent',
                    color: viewMode === 'calendar' ? '#a855f7' : '#9ca3af',
                  }}
                >
                  <CalendarIcon size={13} /> Calendar
                </button>
              </div>

              {/* Add Task Primary Button */}
              <button
                onClick={() => {
                  setDefaultDateForNewTask(undefined);
                  setShowAddTask(true);
                }}
                className="btn-neon px-3.5 py-1.5 text-xs flex items-center gap-1.5 font-bold rounded-lg"
              >
                <Plus size={14} /> Add Task
              </button>
            </div>
          </div>

          {/* Filtering Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <Search size={14} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-glass w-full pl-9 pr-4 py-2 text-xs text-white"
                placeholder="Search tasks, descriptions, sections..."
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Priority Selector */}
            <div className="flex gap-1 p-0.5 rounded-lg bg-white/5 border border-white/5">
              {(['all', 'high', 'medium', 'low'] as const).map((p) => {
                const active = filterPriority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFilterPriority(p)}
                    className="flex-1 py-1 text-[10px] font-bold rounded-md capitalize transition-all"
                    style={{
                      background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
                      color: active ? 'white' : '#9ca3af',
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            {/* Section Selector */}
            <div className="flex gap-1.5 items-center">
              <select
                value={filterSectionId}
                onChange={(e) => setFilterSectionId(e.target.value)}
                className="input-glass flex-1 px-3 py-2 text-xs text-white"
                style={{ colorScheme: 'dark' }}
              >
                <option value="all">All Sections</option>
                <option value="">No Section / Uncategorized</option>
                {taskSections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowSectionManager(true)}
                className="p-2 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-colors"
                title="Manage Sections"
              >
                <FolderPlus size={14} />
              </button>
            </div>
          </div>

          {/* Core Content View */}
          <div className="mt-2 min-h-[300px]">
            {viewMode === 'list' ? (
              <TaskListView
                searchQuery={searchQuery}
                filterPriority={filterPriority}
                filterSectionId={filterSectionId}
                onOpenDetails={(task, completed, date) => setSelectedTaskDetails({ task, completed, date })}
                onToggleTask={handleToggleTask}
                onEditTask={(task) => setEditingTask(task)}
                onDeleteTask={handleDeleteTask}
              />
            ) : (
              <TaskCalendarView
                searchQuery={searchQuery}
                filterPriority={filterPriority}
                filterSectionId={filterSectionId}
                onOpenDetails={(task, completed, date) => setSelectedTaskDetails({ task, completed, date })}
                onToggleTask={handleToggleTask}
                onEditTask={(task) => setEditingTask(task)}
                onDeleteTask={handleDeleteTask}
                onAddTaskForDate={(date) => {
                  setDefaultDateForNewTask(date);
                  setShowAddTask(true);
                }}
              />
            )}
          </div>
        </div>

        {/* Focus history */}
        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="font-semibold mb-4 text-left" style={{ color: 'var(--text-primary)' }}>Recent Focus Sessions</h3>
          {focusSessions.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {focusSessions.slice(0, 7).map((session) => (
                <div
                  key={session.id}
                  className="p-3 rounded-12 text-center"
                  style={{
                    background: 'rgba(168,85,247,0.08)',
                    border: '1px solid rgba(168,85,247,0.15)',
                    borderRadius: 12,
                  }}
                >
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    {format(parseISO(session.session_date), 'MMM d')}
                  </p>
                  <p className="text-lg font-bold" style={{ color: '#a855f7' }}>{session.minutes}m</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{session.sessions_count} sessions</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <Clock size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Start your first focus session!</p>
            </div>
          )}
        </div>

      </div>

      {/* Modals */}
      {showAddTask && (
        <TaskFormModal
          onClose={() => {
            setShowAddTask(false);
            setDefaultDateForNewTask(undefined);
          }}
          onSave={handleCreateTask}
          defaultDate={defaultDateForNewTask}
        />
      )}

      {editingTask && (
        <TaskFormModal
          initialTask={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleUpdateTask}
        />
      )}

      {selectedTaskDetails && (
        <TaskDetailsModal
          task={selectedTaskDetails.task}
          completed={selectedTaskDetails.completed}
          occurrenceDate={selectedTaskDetails.date}
          onClose={() => setSelectedTaskDetails(null)}
          onEdit={() => {
            const taskToEdit = selectedTaskDetails.task;
            setSelectedTaskDetails(null);
            setEditingTask(taskToEdit);
          }}
          onToggle={async () => {
            await handleToggleTask(
              selectedTaskDetails.task,
              selectedTaskDetails.completed,
              selectedTaskDetails.date
            );
            // Toggle completed state inside selectedTaskDetails to keep details modal state updated
            setSelectedTaskDetails((prev) =>
              prev ? { ...prev, completed: !prev.completed } : null
            );
          }}
          onDelete={async () => {
            await handleDeleteTask(selectedTaskDetails.task);
            setSelectedTaskDetails(null);
          }}
        />
      )}

      {showSectionManager && (
        <TaskSectionManager onClose={() => setShowSectionManager(false)} />
      )}

      {showTimerSettings && (
        <TimerSettingsModal
          pomodoroMinutes={pomodoroMinutes}
          breakMinutes={breakMinutes}
          longBreakMinutes={longBreakMinutes}
          onClose={() => setShowTimerSettings(false)}
          onSave={(pomo, brk, longBrk) => {
            useStore.setState({ 
              pomodoroMinutes: pomo,
              breakMinutes: brk,
              longBreakMinutes: longBrk 
            });
            const state = useStore.getState();
            if (!state.timerRunning) {
              if (state.timerMode === 'focus') state.setTimerSeconds(pomo * 60);
              else if (state.timerMode === 'break') state.setTimerSeconds(brk * 60);
              else if (state.timerMode === 'longbreak') state.setTimerSeconds(longBrk * 60);
            }
            setShowTimerSettings(false);
          }}
        />
      )}
    </div>
  );
}

function TimerSettingsModal({
  pomodoroMinutes,
  breakMinutes,
  longBreakMinutes,
  onClose,
  onSave,
}: {
  pomodoroMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  onClose: () => void;
  onSave: (pomo: number, brk: number, longBrk: number) => void;
}) {
  const [pomo, setPomo] = useState(String(pomodoroMinutes));
  const [brk, setBrk] = useState(String(breakMinutes));
  const [longBrk, setLongBrk] = useState(String(longBreakMinutes));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3
            className="font-bold text-lg"
            style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}
          >
            Timer Settings
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Focus Duration', value: pomo, set: setPomo, color: '#a855f7' },
            { label: 'Short Break', value: brk, set: setBrk, color: '#10b981' },
            { label: 'Long Break', value: longBrk, set: setLongBrk, color: '#06b6d4' },
          ].map(({ label, value, set, color }) => (
            <div key={label}>
              <label
                className="text-xs font-medium mb-1.5 block"
                style={{ color: 'var(--text-muted)' }}
              >
                {label} (minutes)
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => set(e.target.value)}
                className="input-glass w-full px-4 py-3 text-sm"
                min="1"
                max="120"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-ghost flex-1 px-4 py-2.5 text-sm">
            Cancel
          </button>
          <button
            onClick={() => {
              const pVal = parseInt(pomo), bVal = parseInt(brk), lbVal = parseInt(longBrk);
              const p = isNaN(pVal) ? 25 : Math.max(1, Math.min(120, pVal));
              const b = isNaN(bVal) ? 5 : Math.max(1, Math.min(120, bVal));
              const lb = isNaN(lbVal) ? 15 : Math.max(1, Math.min(120, lbVal));
              onSave(p, b, lb);
            }}
            className="btn-neon flex-1 px-4 py-2.5 text-sm"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
