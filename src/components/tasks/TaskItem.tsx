import React from 'react';
import { Circle, CheckCircle2, Trash2, Edit2, Calendar, Bell, RotateCcw, AlertTriangle } from 'lucide-react';
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
  const isRecurring = task.recurrence_type && task.recurrence_type !== 'none';

  // Determine if there's any metadata to show (Row 2)
  const hasMetadata = !completed && (
    section ||
    task.deadline ||
    task.description
  );

  // Determine if there are any status badges (Row 3)
  const hasBadges = (
    task.priority ||
    isOverdue ||
    (!completed && isToday) ||
    isRecurring ||
    task.reminder_enabled ||
    completed
  );

  return (
    <div
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-0.5 cursor-pointer select-none bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
    >
      {/* Background radial highlight */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 10% 20%, rgba(168,85,247,0.06), transparent 70%)`,
        }}
      />

      {/* Priority accent line */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ background: getPriorityColor(task.priority) }}
      />

      <div className="relative pl-4 pr-3 py-3 flex flex-col gap-2">

        {/* ═══════════════════════════════════════════════
            ROW 1 — Checkbox + Title + Quick Actions
            ═══════════════════════════════════════════════ */}
        <div className="flex items-center gap-2.5">
          {/* Checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(e);
            }}
            className="flex-shrink-0 transition-colors"
            style={{ color: completed ? '#10b981' : 'var(--text-muted)' }}
          >
            {completed ? (
              <CheckCircle2 size={18} className="text-green-500 filter drop-shadow-[0_0_4px_rgba(16,185,129,0.4)]" />
            ) : (
              <Circle size={18} className="hover:text-white hover:scale-105 active:scale-95 transition-all" />
            )}
          </button>

          {/* Title */}
          <span
            className="flex-1 min-w-0 text-sm font-semibold tracking-tight truncate"
            style={{
              textDecoration: completed ? 'line-through' : 'none',
              color: completed ? 'rgba(255,255,255,0.35)' : '#ffffff',
            }}
          >
            {task.title}
          </span>

          {/* Quick Actions — visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(e);
              }}
              className="p-1 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-md border border-white/5 hover:border-white/10 transition-all duration-200"
            >
              <Edit2 size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(e);
              }}
              className="p-1 text-red-400/70 hover:text-red-300 bg-red-500/5 hover:bg-red-500/15 rounded-md border border-red-500/10 hover:border-red-500/20 transition-all duration-200"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            ROW 2 — Metadata (conditional)
            ═══════════════════════════════════════════════ */}
        {hasMetadata && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-7 text-[11px] text-gray-500">
            {/* Section */}
            {section && (
              <span className="flex items-center gap-1" style={{ color: section.color }}>
                {SectionIcon && <SectionIcon size={11} />}
                {section.name}
              </span>
            )}

            {/* Due date */}
            {task.deadline && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : ''}`}>
                <Calendar size={11} />
                Due {task.deadline}
              </span>
            )}

            {/* Description preview */}
            {task.description && (
              <span className="truncate max-w-[200px] text-gray-600 italic">
                {task.description}
              </span>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            ROW 3 — Status Badges
            ═══════════════════════════════════════════════ */}
        {hasBadges && (
          <div className="flex flex-wrap items-center gap-1.5 pl-7">
            {/* Priority */}
            <span
              className="text-[9px] font-bold px-1.5 py-[1px] rounded uppercase leading-relaxed"
              style={{
                backgroundColor: `${getPriorityColor(task.priority)}12`,
                color: getPriorityColor(task.priority),
                border: `1px solid ${getPriorityColor(task.priority)}22`,
              }}
            >
              {task.priority}
            </span>

            {/* Overdue */}
            {isOverdue && (
              <span className="text-[9px] font-bold px-1.5 py-[1px] rounded flex items-center gap-0.5 bg-red-500/10 border border-red-500/20 text-red-400 animate-pulse leading-relaxed">
                <AlertTriangle size={9} /> Overdue
              </span>
            )}

            {/* Today */}
            {!completed && isToday && (
              <span className="text-[9px] font-bold px-1.5 py-[1px] rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 leading-relaxed">
                Today
              </span>
            )}

            {/* Repeating */}
            {isRecurring && (
              <span className="text-[9px] font-bold px-1.5 py-[1px] rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center gap-0.5 leading-relaxed">
                <RotateCcw size={8} /> Repeating
              </span>
            )}

            {/* Reminder */}
            {task.reminder_enabled && (
              <span
                className="text-[9px] font-bold px-1.5 py-[1px] rounded bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center gap-0.5 leading-relaxed"
                title={task.reminder_time ? `Remind at ${task.reminder_time}` : 'Default reminder (9:00 AM)'}
              >
                <Bell size={8} />
                {task.reminder_time || '9:00 AM'}
              </span>
            )}

            {/* Completed */}
            {completed && (
              <span className="text-[9px] font-bold px-1.5 py-[1px] rounded bg-green-500/10 border border-green-500/20 text-green-400 leading-relaxed">
                Completed
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
