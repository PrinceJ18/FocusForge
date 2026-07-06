import React from 'react';
import { Circle, CheckCircle2, Trash2, Edit2, Clock, Calendar, Bell, RotateCcw, AlertTriangle } from 'lucide-react';
import { useStore, Task } from '../../store/useStore';
import { format } from 'date-fns';
import { ICON_MAP } from './TaskSectionManager';

interface TaskItemProps {
  task: Task;
  completed: boolean;
  occurrenceDate: string; // YYYY-MM-DD
  onToggle: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onClick: () => void;
}

export default function TaskItem({
  task,
  completed,
  occurrenceDate,
  onToggle,
  onEdit,
  onDelete,
  onClick,
}: TaskItemProps) {
  const { taskSections } = useStore();

  const section = taskSections.find((s) => s.id === task.section_id);
  const SectionIcon = section ? ICON_MAP[section.icon] || Calendar : null;

  const getPriorityColor = (p: string) => {
    if (p === 'high') return '#ef4444';
    if (p === 'medium') return '#f59e0b';
    return '#10b981';
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isOverdue = !completed && task.deadline && task.deadline < todayStr;
  const isToday = task.scheduled_date === todayStr;

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer flex gap-3 items-start select-none bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]`}
    >
      {/* Background radial highlight */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 10% 20%, rgba(168,85,247,0.06), transparent 70%)`,
        }}
      />

      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(e);
        }}
        className="flex-shrink-0 mt-0.5 text-gray-400 hover:text-white transition-colors"
        style={{ color: completed ? '#10b981' : 'var(--text-muted)' }}
      >
        {completed ? (
          <CheckCircle2 size={19} className="text-green-500 filter drop-shadow-[0_0_4px_rgba(16,185,129,0.4)]" />
        ) : (
          <Circle size={19} className="hover:scale-105 active:scale-95 transition-transform" />
        )}
      </button>

      {/* Info Body */}
      <div className="flex-1 min-w-0 flex flex-col gap-1 text-left">
        {/* Title */}
        <p
          className="text-sm font-semibold tracking-tight truncate pr-14 text-white"
          style={{
            textDecoration: completed ? 'line-through' : 'none',
            color: completed ? 'rgba(255,255,255,0.4)' : '#ffffff'
          }}
        >
          {task.title}
        </p>

        {/* Truncated Description */}
        {task.description && !completed && (
          <p className="text-xs text-gray-400 truncate pr-14 line-clamp-1">
            {task.description}
          </p>
        )}

        {/* Badges footer */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {/* Priority */}
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
            style={{
              backgroundColor: `${getPriorityColor(task.priority)}15`,
              color: getPriorityColor(task.priority),
              border: `1px solid ${getPriorityColor(task.priority)}25`
            }}
          >
            {task.priority}
          </span>

          {/* Section */}
          {section && (
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{
                backgroundColor: `${section.color}15`,
                color: section.color,
                border: `1px solid ${section.color}25`
              }}
            >
              {SectionIcon && <SectionIcon size={9} />}
              {section.name}
            </span>
          )}

          {/* Due status badges */}
          {isOverdue && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 bg-red-500/10 border border-red-500/25 text-red-400 animate-pulse">
              <AlertTriangle size={9} /> Overdue
            </span>
          )}

          {!completed && isToday && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400">
              Today
            </span>
          )}

          {/* Recurrence Loop Icon */}
          {task.recurrence_type && task.recurrence_type !== 'none' && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 flex items-center gap-0.5">
              <RotateCcw size={8} /> Repeating
            </span>
          )}

          {/* Reminder Bell Icon */}
          {task.reminder_enabled && (
            <span 
              className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-400 flex items-center gap-0.5"
              title={task.reminder_time ? `Remind at ${task.reminder_time}` : 'Default reminder (9:00 AM)'}
            >
              <Bell size={8} /> 
              {task.reminder_time || '9:00 AM'}
            </span>
          )}

          {/* Date Label */}
          {task.deadline && (
            <span className="text-[9px] text-gray-500 flex items-center gap-0.5 font-medium ml-1">
              <Calendar size={10} />
              Due {task.deadline}
            </span>
          )}
        </div>
      </div>

      {/* Hover Quick Actions */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(e);
          }}
          className="p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 hover:border-white/10 transition-all duration-200"
        >
          <Edit2 size={13} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(e);
          }}
          className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/10 hover:border-red-500/20 transition-all duration-200"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
