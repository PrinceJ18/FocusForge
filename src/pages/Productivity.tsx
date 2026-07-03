import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Plus, Trash2, CheckCircle2, Circle, Coffee, Brain, Settings, X, Clock, Flame } from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { calculateTodayFocus, calculateTodaySessions } from '../lib/statistics';
import { logEvent } from '../lib/events';

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
    timerSeconds, timerRunning, timerMode, pomodoroMinutes, breakMinutes, longBreakMinutes, sessionCount,
    setTimerSeconds, setTimerRunning, setTimerMode, setPomodoroMinutes,
    addTaskLocal, updateTaskLocal, removeTaskLocal, addXP,
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

  const progress =
    ((totalSeconds - safeTimerSeconds) / totalSeconds) * 100;
  const radius = window.innerWidth < 640 ? 105 : 140;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const todayMinutes = calculateTodayFocus(focusSessions);
  const todaySessionCount = calculateTodaySessions(focusSessions);

  const [showAddTask, setShowAddTask] = useState(false);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [filterPriority, setFilterPriority] = useState<'all' | Priority>('all');

  // Timer interval is handled globally by useTimerEngine in App.tsx.
  // No local interval needed — the timer persists across page navigation.

  const handleStart = () => setTimerRunning(true);
  const handlePause = () => setTimerRunning(false);
  const handleReset = () => {
    setTimerRunning(false);

    setTimerSeconds(
      timerMode === 'focus'
        ? pomodoroMinutes * 60
        : timerMode === 'break'
          ? breakMinutes * 60
          : longBreakMinutes * 60
    );
  };

  const switchMode = (mode: string) => {
    setTimerRunning(false);
    setTimerMode(mode as any);
    setTimerSeconds(
      mode === 'focus' ? pomodoroMinutes * 60
        : mode === 'break' ? breakMinutes * 60
          : longBreakMinutes * 60
    );
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const modeColor = timerMode === 'focus' ? '#a855f7' : timerMode === 'break' ? '#10b981' : '#06b6d4';

  const filteredTasks = tasks.filter((t) => filterPriority === 'all' || t.priority === filterPriority);
  const pendingTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);
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
          </div>

          {/* Premium productivity stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-2">

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
              <div className="relative z-10">
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
              <div className="relative z-10">
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
              <div className="relative z-10">
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

        {/* Tasks */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Tasks ({pendingTasks.length} pending)
            </h3>
            <button
              onClick={() => setShowAddTask(true)}
              className="btn-neon px-3 py-2 text-sm flex items-center gap-1.5"
              style={{ borderRadius: 10 }}
            >
              <Plus size={14} /> Add Task
            </button>
          </div>

          {/* Priority filter */}
          <div className="flex gap-2 mb-4">
            {(['all', 'high', 'medium', 'low'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setFilterPriority(p)}
                className="px-2.5 py-1 text-xs rounded-lg font-medium transition-all capitalize"
                style={{
                  background: filterPriority === p ? getPriorityColor(p) + '25' : 'rgba(255,255,255,0.05)',
                  color: filterPriority === p ? getPriorityColor(p) : 'var(--text-muted)',
                  border: `1px solid ${filterPriority === p ? getPriorityColor(p) + '50' : 'transparent'}`,
                }}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 400 }}>
            {pendingTasks.length === 0 && completedTasks.length === 0 ? (
              <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No tasks yet. Add one!</p>
              </div>
            ) : (
              <>
                {pendingTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={async () => {
                      const now = new Date().toISOString();

                      updateTaskLocal(task.id, {
                        completed: true,
                        completed_at: now,
                      });

                      logEvent('task_completed', 'tasks', task.id, {
                        title: task.title,
                        description: `Completed task: ${task.title}`,
                      });

                      const xpEarned =
                        task.priority === 'high'
                          ? 20
                          : task.priority === 'medium'
                            ? 10
                            : 5;

                      console.log(
                        'COMPLETE TASK',
                        task.title,
                        task.priority,
                        task.xp_awarded
                      );

                      if (!task.xp_awarded) {
                        await addXP(xpEarned);

                        // Trigger global notification
                        useStore.getState().showNotification({
                          type: 'xp',
                          title: `+${xpEarned} XP Earned`,
                          message: `Task completed: ${task.title}`,
                          xp: xpEarned,
                        });

                        updateTaskLocal(task.id, {
                          xp_awarded: true,
                        });

                        if (user) {
                          await supabase
                            .from('tasks')
                            .update({
                              xp_awarded: true
                            })
                            .eq('id', task.id);
                        }
                      }
                      if (user) {
                        await supabase.from('tasks').update({ completed: true, completed_at: now }).eq('id', task.id);
                      }
                    }}
                    onDelete={async () => {
                      removeTaskLocal(task.id);
                      if (user) await supabase.from('tasks').delete().eq('id', task.id);
                    }}
                  />
                ))}

                {completedTasks.length > 0 && (
                  <>
                    <div className="pt-2">
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                        Completed ({completedTasks.length})
                      </p>
                    </div>
                    {completedTasks.slice(0, 5).map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onToggle={async () => {
                          const xpEarned = getTaskXP(task.priority);

                          await addXP(-xpEarned);

                          updateTaskLocal(task.id, {
                            completed: false,
                            completed_at: null,
                            xp_awarded: false,
                          });
                          if (user) {
                            await supabase.from('tasks').update({ completed: false, completed_at: null, xp_awarded: false, }).eq('id', task.id);
                          }
                        }}
                        onDelete={async () => {
                          removeTaskLocal(task.id);
                          if (user) await supabase.from('tasks').delete().eq('id', task.id);
                        }}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Focus history */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Focus Sessions</h3>
          {focusSessions.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
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
        <AddTaskModal
          onClose={() => setShowAddTask(false)}
          onAdd={async (data) => {
            const newTask = {
              id: crypto.randomUUID(),
              user_id: user?.id || 'local',
              ...data,
              completed: false,
              created_at: new Date().toISOString(),
              completed_at: null,
            };
            addTaskLocal(newTask);
            if (user) {
              const { data: inserted, error } = await supabase
                .from('tasks')
                .insert({
                  user_id: user.id,
                  ...data,
                  completed: false,
                })
                .select()
                .single();

              console.log('TASK INSERT', inserted);
              console.log('TASK ERROR MESSAGE', error?.message);
              console.log('TASK ERROR DETAILS', error?.details);
              console.log('TASK ERROR CODE', error?.code);
              if (inserted) {
                removeTaskLocal(newTask.id);
                addTaskLocal(inserted);
              }
            }
            setShowAddTask(false);
          }}
        />
      )}

      {showTimerSettings && (
        <TimerSettingsModal
          pomodoroMinutes={pomodoroMinutes}
          breakMinutes={breakMinutes}
          longBreakMinutes={longBreakMinutes}
          onClose={() => setShowTimerSettings(false)}
          onSave={(pomo, brk, longBrk) => {
            setPomodoroMinutes(pomo);
            useStore.setState({ breakMinutes: brk, longBreakMinutes: longBrk });
            if (timerMode === 'focus') setTimerSeconds(pomo * 60);
            else if (timerMode === 'break') setTimerSeconds(brk * 60);
            else setTimerSeconds(longBrk * 60);
            setShowTimerSettings(false);
          }}
        />
      )}
    </div>
  );
}

function TaskItem({
  task,
  onToggle,
  onDelete,
}: {
  task: any;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`task-item ${task.completed ? 'completed' : ''}`}>
      <button
        onClick={onToggle}
        className="flex-shrink-0 mt-0.5"
        style={{
          color: task.completed ? '#10b981' : 'var(--text-muted)',
        }}
      >
        {task.completed ? (
          <CheckCircle2 size={18} />
        ) : (
          <Circle size={18} />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium"
          style={{
            color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
            textDecoration: task.completed ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </p>

        {(task.subject || task.deadline) && (
          <p
            className="text-xs mt-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            {task.subject && (
              <span>{task.subject}</span>
            )}
            {task.subject && task.deadline && (
              <span> • </span>
            )}
            {task.deadline && (
              <span>Due {task.deadline}</span>
            )}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className="text-xs px-2 py-0.5 rounded-full capitalize"
          style={{
            background: `${getPriorityColor(task.priority)}20`,
            color: getPriorityColor(task.priority),
          }}
        >
          {task.priority}
        </span>

        <button
          onClick={onDelete}
          className="transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function AddTaskModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: any) => void;
}) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [deadline, setDeadline] = useState('');
  const [subject, setSubject] = useState('');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3
            className="font-bold text-lg"
            style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}
          >
            New Task
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label
              className="text-xs font-medium mb-1.5 block"
              style={{ color: 'var(--text-muted)' }}
            >
              Task Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-glass w-full px-4 py-3 text-sm"
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>
          <div>
            <label
              className="text-xs font-medium mb-1.5 block"
              style={{ color: 'var(--text-muted)' }}
            >
              Priority
            </label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className="flex-1 py-2 text-sm font-medium rounded-xl capitalize transition-all"
                  style={{
                    background: priority === p ? `${getPriorityColor(p)}20` : 'rgba(255,255,255,0.05)',
                    color: priority === p ? getPriorityColor(p) : 'var(--text-muted)',
                    border: `1px solid ${priority === p ? getPriorityColor(p) + '50' : 'transparent'}`,
                    borderRadius: 10,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="text-xs font-medium mb-1.5 block"
                style={{ color: 'var(--text-muted)' }}
              >
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input-glass w-full px-3 py-2.5 text-sm"
                placeholder="Math, CS..."
              />
            </div>
            <div>
              <label
                className="text-xs font-medium mb-1.5 block"
                style={{ color: 'var(--text-muted)' }}
              >
                Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input-glass w-full px-3 py-2.5 text-sm"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-ghost flex-1 px-4 py-2.5 text-sm">
            Cancel
          </button>
          <button
            onClick={() => {
              if (title) onAdd({ title, priority, deadline: deadline || null, subject });
            }}
            className="btn-neon flex-1 px-4 py-2.5 text-sm"
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
}

function getPriorityColor(p: string): string {
  if (p === 'high') return '#ef4444';
  if (p === 'medium') return '#f59e0b';
  return '#10b981';
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
              const p = parseInt(pomo), b = parseInt(brk), lb = parseInt(longBrk);
              if (p > 0 && b > 0 && lb > 0) onSave(p, b, lb);
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

