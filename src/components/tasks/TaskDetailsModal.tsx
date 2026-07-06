import React, { useState } from 'react';
import { X, Calendar, Clock, RotateCcw, AlertCircle, Edit2, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { useStore, Task } from '../../store/useStore';
import { format, parseISO } from 'date-fns';
import { ICON_MAP } from './TaskSectionManager';

interface TaskDetailsModalProps {
  task: Task;
  completed: boolean;
  occurrenceDate: string; // YYYY-MM-DD
  onClose: () => void;
  onEdit: () => void;
  onToggle: () => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function TaskDetailsModal({
  task,
  completed,
  occurrenceDate,
  onClose,
  onEdit,
  onToggle,
  onDelete,
}: TaskDetailsModalProps) {
  const { taskSections } = useStore();
  const [busy, setBusy] = useState(false);

  // Look up custom section
  const section = taskSections.find((s) => s.id === task.section_id);
  const SectionIcon = section ? ICON_MAP[section.icon] || Calendar : Calendar;

  const handleToggle = async () => {
    setBusy(true);
    try {
      await onToggle();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle task completion.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    const isRecurring = task.recurrence_type && task.recurrence_type !== 'none';
    const msg = isRecurring
      ? 'WARNING: Deleting this repeating task will remove the recurrence rule definition and ALL completion logs for all occurrences. Are you sure you want to delete this task?'
      : 'Are you sure you want to delete this task?';
    
    if (window.confirm(msg)) {
      setBusy(true);
      try {
        await onDelete();
        onClose();
      } catch (err: any) {
        alert(err.message || 'Failed to delete task.');
        setBusy(false);
      }
    }
  };

  const getRecurrenceText = () => {
    if (!task.recurrence_type || task.recurrence_type === 'none') return 'One-time task';
    
    const intervalVal = task.recurrence_interval || 1;
    const intervalStr = intervalVal > 1 ? `every ${intervalVal}` : 'every';
    let pattern = '';

    if (task.recurrence_type === 'daily') {
      pattern = intervalVal > 1 ? `every ${intervalVal} days` : 'daily';
    } else if (task.recurrence_type === 'weekly') {
      pattern = intervalVal > 1 ? `every ${intervalVal} weeks` : 'weekly';
    } else if (task.recurrence_type === 'monthly') {
      pattern = intervalVal > 1 ? `every ${intervalVal} months` : 'monthly';
    } else if (task.recurrence_type === 'weekdays') {
      const days = task.recurrence_weekdays
        ? task.recurrence_weekdays.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')
        : 'Weekdays';
      pattern = `weekly on ${days}`;
    } else if (task.recurrence_type === 'custom') {
      pattern = `every ${intervalVal} days`;
    }

    const endStr = task.has_no_end_date
      ? 'with no end date'
      : `until ${task.recurrence_end_date}`;

    return `Repeats ${pattern}, ${endStr}`;
  };

  const getPriorityColor = (p: string): string => {
    if (p === 'high') return '#ef4444';
    if (p === 'medium') return '#f59e0b';
    return '#10b981';
  };

  // Check if overdue
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isOverdue = !completed && task.deadline && task.deadline < todayStr;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 90 }}>
      <div 
        className="modal-content p-6 max-w-lg w-full" 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(20, 16, 32, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px'
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4 pb-2 border-b border-white/5">
          <div className="min-w-0 flex-1 text-left">
            <h3 className="font-bold text-xl text-white tracking-tight break-words" style={{ fontFamily: 'Space Grotesk' }}>
              {task.title}
            </h3>
            
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Priority badge */}
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                style={{
                  background: `${getPriorityColor(task.priority)}20`,
                  color: getPriorityColor(task.priority),
                  border: `1px solid ${getPriorityColor(task.priority)}30`
                }}
              >
                {task.priority} Priority
              </span>

              {/* Section badge */}
              {section && (
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    backgroundColor: `${section.color}15`,
                    color: section.color,
                    border: `1px solid ${section.color}35`
                  }}
                >
                  <SectionIcon size={10} />
                  {section.name}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-left">
          {/* Description */}
          {task.description ? (
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
              {task.description}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">No description provided.</p>
          )}

          {/* Occurrence details warning for recurring tasks */}
          {task.recurrence_type && task.recurrence_type !== 'none' && (
            <div className="flex items-start gap-2 p-3 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-xl text-xs">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                Viewing occurrence on <span className="font-bold">{occurrenceDate}</span> of a repeating task sequence.
              </div>
            </div>
          )}

          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-white/[0.01] p-4 rounded-xl border border-white/5">
            {/* Status */}
            <div>
              <span className="text-gray-500 block mb-0.5">Status</span>
              {completed ? (
                <span className="text-green-400 font-bold flex items-center gap-1">✓ Completed</span>
              ) : isOverdue ? (
                <span className="text-red-400 font-bold flex items-center gap-1">⚠️ Overdue</span>
              ) : (
                <span className="text-yellow-400 font-bold flex items-center gap-1">○ Pending</span>
              )}
            </div>

            {/* Scheduled Date */}
            <div>
              <span className="text-gray-500 block mb-0.5">Scheduled Date</span>
              <span className="text-white font-medium">{task.scheduled_date || 'None'}</span>
            </div>

            {/* Due Date */}
            <div>
              <span className="text-gray-500 block mb-0.5">Due Date</span>
              <span className="text-white font-medium">{task.deadline || 'No due date'}</span>
            </div>

            {/* Reminder */}
            <div>
              <span className="text-gray-500 block mb-0.5">Reminder</span>
              <span className="text-white font-medium flex items-center gap-1">
                <Clock size={12} className="text-gray-400" />
                {!task.reminder_enabled 
                  ? 'Off' 
                  : !task.reminder_time 
                    ? 'Default (9:00 AM)' 
                    : task.reminder_time}
              </span>
            </div>

            {/* Recurrence Rule */}
            <div className="col-span-2 pt-2 border-t border-white/5">
              <span className="text-gray-500 block mb-0.5">Recurrence Rule</span>
              <span className="text-purple-300 font-medium flex items-center gap-1">
                <RotateCcw size={12} className="text-purple-400" />
                {getRecurrenceText()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2.5 mt-6 border-t border-white/5 pt-4">
          <button
            onClick={handleToggle}
            disabled={busy}
            className="flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-xl transition-all"
            style={{
              background: completed ? 'rgba(239,68,68,0.1)' : 'linear-gradient(135deg, #a855f7, #ec4899)',
              color: completed ? '#ef4444' : 'white',
              border: completed ? '1px solid rgba(239,68,68,0.2)' : 'none'
            }}
          >
            {completed ? (
              <>
                <Circle size={16} /> Mark Incomplete
              </>
            ) : (
              <>
                <CheckCircle2 size={16} /> Complete Task
              </>
            )}
          </button>

          <button
            onClick={onEdit}
            disabled={busy}
            className="p-3 text-gray-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all"
          >
            <Edit2 size={16} />
          </button>

          <button
            onClick={handleDelete}
            disabled={busy}
            className="p-3 text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl transition-all"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
