import React, { useState } from 'react';
import { Calendar, Clock, RotateCcw, AlertCircle, Edit2, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { useStore, Task } from '../../store/useStore';
import { format } from 'date-fns';
import { ICON_MAP } from './TaskSectionManager';
import Modal from '../ui/Modal';

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
    <Modal
      isOpen={true}
      onClose={onClose}
      title={task.title}
      subtitle={
        <span className="flex flex-wrap items-center gap-2 mt-1">
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
        </span>
      }
      maxWidth="lg"
      footer={
        <div className="flex gap-2.5 w-full">
          <button
            onClick={handleToggle}
            disabled={busy}
            className="flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2 rounded-xl transition-all"
            style={{
              background: completed ? 'rgba(239,68,68,0.1)' : 'linear-gradient(135deg, #a855f7, #ec4899)',
              color: completed ? '#ef4444' : 'white',
              border: completed ? '1px solid rgba(239,68,68,0.2)' : 'none'
            }}
          >
            {completed ? (
              <>
                <Circle size={15} /> Mark Incomplete
              </>
            ) : (
              <>
                <CheckCircle2 size={15} /> Complete Task
              </>
            )}
          </button>

          <button
            onClick={onEdit}
            disabled={busy}
            className="p-2.5 text-slate-400 hover:text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl transition-all"
            title="Edit Task"
          >
            <Edit2 size={16} />
          </button>

          <button
            onClick={handleDelete}
            disabled={busy}
            className="p-2.5 text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl transition-all"
            title="Delete Task"
          >
            <Trash2 size={16} />
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-left">
        {/* Description */}
        {task.description ? (
          <div className="p-3.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
            {task.description}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No description provided.</p>
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
        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
          {/* Status */}
          <div>
            <span className="text-slate-400 block mb-0.5">Status</span>
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
            <span className="text-slate-400 block mb-0.5">Scheduled Date</span>
            <span className="text-slate-100 font-medium">{task.scheduled_date || 'None'}</span>
          </div>

          {/* Due Date */}
          <div>
            <span className="text-slate-400 block mb-0.5">Due Date</span>
            <span className="text-slate-100 font-medium">{task.deadline || 'No due date'}</span>
          </div>

          {/* Reminder */}
          <div>
            <span className="text-slate-400 block mb-0.5">Reminder</span>
            <span className="text-slate-100 font-medium flex items-center gap-1">
              <Clock size={12} className="text-slate-400" />
              {!task.reminder_enabled 
                ? 'Off' 
                : !task.reminder_time 
                  ? 'Default (9:00 AM)' 
                  : task.reminder_time}
            </span>
          </div>

          {/* Recurrence Rule */}
          <div className="col-span-2 pt-2 border-t border-slate-700/60">
            <span className="text-slate-400 block mb-0.5">Recurrence Rule</span>
            <span className="text-purple-300 font-medium flex items-center gap-1">
              <RotateCcw size={12} className="text-purple-400" />
              {getRecurrenceText()}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

