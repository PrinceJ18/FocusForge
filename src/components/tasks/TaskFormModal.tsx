import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, RotateCcw, FolderPlus } from 'lucide-react';
import { useStore, Task } from '../../store/useStore';
import TaskSectionManager from './TaskSectionManager';
import { format, parseISO, isBefore } from 'date-fns';

interface TaskFormModalProps {
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialTask?: Task;
  defaultDate?: string;
}

const WEEKDAYS = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
];

export default function TaskFormModal({ onClose, onSave, initialTask, defaultDate }: TaskFormModalProps) {
  const { taskSections } = useStore();
  const [showSectionManager, setShowSectionManager] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [sectionId, setSectionId] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [deadline, setDeadline] = useState(''); // Due/end date

  // Reminder settings
  const [reminderType, setReminderType] = useState<'off' | 'default' | 'custom'>('off');
  const [reminderTime, setReminderTime] = useState('09:00');

  // Recurrence settings
  const [recurrenceType, setRecurrenceType] = useState<string>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<string[]>([]);
  const [recurrenceEndType, setRecurrenceEndType] = useState<'never' | 'date'>('never');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  // Validation Error state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Initialize form fields
  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
      setPriority(initialTask.priority);
      setSectionId(initialTask.section_id || '');
      setScheduledDate(initialTask.scheduled_date || '');
      setDeadline(initialTask.deadline || '');

      // Reminders mapping
      if (!initialTask.reminder_enabled) {
        setReminderType('off');
      } else if (!initialTask.reminder_time) {
        setReminderType('default');
      } else {
        setReminderType('custom');
        setReminderTime(initialTask.reminder_time);
      }

      // Recurrence mapping
      setRecurrenceType(initialTask.recurrence_type || 'none');
      setRecurrenceInterval(initialTask.recurrence_interval || 1);
      setRecurrenceWeekdays(initialTask.recurrence_weekdays || []);
      setRecurrenceEndType(initialTask.has_no_end_date ? 'never' : 'date');
      setRecurrenceEndDate(initialTask.recurrence_end_date || '');
    } else {
      // Default scheduled date to selected calendar date or today
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      setScheduledDate(defaultDate || todayStr);
    }
  }, [initialTask, defaultDate]);

  const toggleWeekday = (day: string) => {
    setRecurrenceWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required.';
    }

    if (!scheduledDate) {
      newErrors.scheduledDate = 'Scheduled date is required.';
    }

    // Due date vs Scheduled date check
    if (deadline && scheduledDate && deadline < scheduledDate) {
      newErrors.deadline = 'Due/End Date cannot be before the Scheduled Date.';
    }

    // Recurrence validation
    if (recurrenceType !== 'none') {
      if (recurrenceInterval < 1) {
        newErrors.recurrenceInterval = 'Interval must be 1 or higher.';
      }

      if (recurrenceType === 'weekdays' && recurrenceWeekdays.length === 0) {
        newErrors.recurrenceWeekdays = 'Please select at least one weekday.';
      }

      if (recurrenceEndType === 'date') {
        if (!recurrenceEndDate) {
          newErrors.recurrenceEndDate = 'End date is required for limited recurrence.';
        } else if (scheduledDate && recurrenceEndDate < scheduledDate) {
          newErrors.recurrenceEndDate = 'Recurrence end date cannot be before the Scheduled Date.';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);

    const payload: any = {
      title: title.trim(),
      description: description.trim(),
      priority,
      section_id: sectionId || null,
      scheduled_date: scheduledDate,
      deadline: deadline || null,
      
      // Reminders payload
      reminder_enabled: reminderType !== 'off',
      reminder_time: reminderType === 'custom' ? reminderTime : null,

      // Recurrence payload
      recurrence_type: recurrenceType,
      recurrence_interval: recurrenceType !== 'none' ? recurrenceInterval : null,
      recurrence_weekdays: recurrenceType === 'weekdays' ? recurrenceWeekdays : null,
      has_no_end_date: recurrenceType !== 'none' ? recurrenceEndType === 'never' : true,
      recurrence_end_date: (recurrenceType !== 'none' && recurrenceEndType === 'date') ? recurrenceEndDate : null,

      // Subject fallback compatibility
      subject: 'Other',
    };

    // If custom section selected, copy section name to legacy subject just in case of dashboard schedules
    if (sectionId) {
      const match = taskSections.find((s) => s.id === sectionId);
      if (match) payload.subject = match.name;
    }

    try {
      await onSave(payload);
    } catch (err: any) {
      setErrors({ form: err.message || 'An error occurred while saving.' });
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100 }}>
        <div 
          className="modal-content p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto" 
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
          <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-3">
            <h3 className="font-bold text-lg text-white flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
              <Calendar size={18} className="text-purple-400" />
              {initialTask ? 'Edit Task' : 'Create Task'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-left">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Task Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-glass w-full px-4 py-3 text-sm text-white"
                placeholder="What needs to be done?"
                autoFocus
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="input-glass w-full px-4 py-3 text-sm text-white resize-none"
                placeholder="Add notes, details, links..."
              />
            </div>

            {/* Priority & Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Priority */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Priority</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((p) => {
                    const activeColor = p === 'high' ? '#ef4444' : p === 'medium' ? '#f59e0b' : '#10b981';
                    const active = priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className="flex-1 py-2 text-xs font-bold rounded-xl capitalize transition-all"
                        style={{
                          background: active ? `${activeColor}15` : 'rgba(255,255,255,0.03)',
                          color: active ? activeColor : '#9ca3af',
                          border: `1px solid ${active ? `${activeColor}40` : 'rgba(255,255,255,0.05)'}`,
                          borderRadius: 10
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-400 block">Section</label>
                  <button
                    type="button"
                    onClick={() => setShowSectionManager(true)}
                    className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-bold"
                  >
                    <FolderPlus size={10} /> Manage Sections
                  </button>
                </div>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="input-glass w-full px-3 py-2.5 text-sm text-white"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="">No Section / Uncategorized</option>
                  {taskSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Scheduled Date */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Scheduled Date *</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="input-glass w-full px-3 py-2 text-sm text-white"
                  style={{ colorScheme: 'dark' }}
                />
                {errors.scheduledDate && <p className="text-xs text-red-500 mt-1">{errors.scheduledDate}</p>}
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Due/End Date (Optional)</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="input-glass w-full px-3 py-2 text-sm text-white"
                  style={{ colorScheme: 'dark' }}
                />
                {errors.deadline && <p className="text-xs text-red-500 mt-1">{errors.deadline}</p>}
              </div>
            </div>

            {/* Reminders section */}
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-white uppercase tracking-wider">
                <Clock size={14} className="text-purple-400" />
                Task Reminders
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <select
                  value={reminderType}
                  onChange={(e) => setReminderType(e.target.value as any)}
                  className="input-glass px-3 py-2 text-sm text-white col-span-2"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="off">Reminder Off</option>
                  <option value="default">Default (9:00 AM on date)</option>
                  <option value="custom">Custom Time</option>
                </select>

                {reminderType === 'custom' && (
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="input-glass px-3 py-2 text-sm text-white"
                    style={{ colorScheme: 'dark' }}
                  />
                )}
              </div>
              {reminderType !== 'off' && (
                <p className="text-[10px] text-gray-400 mt-2">
                  🔔 Effective reminder resolves to:{' '}
                  <span className="text-purple-400 font-bold">
                    {reminderType === 'default' ? '9:00 AM' : reminderTime} on scheduled date
                  </span>.
                </p>
              )}
            </div>

            {/* Recurrence System */}
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <RotateCcw size={14} className="text-purple-400" />
                Recurrence (Repeating Tasks)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recurrence Type */}
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Repeat Pattern</label>
                  <select
                    value={recurrenceType}
                    onChange={(e) => setRecurrenceType(e.target.value)}
                    className="input-glass w-full px-3 py-2.5 text-sm text-white"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="none">None (One-time Task)</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="weekdays">Specific Weekdays</option>
                    <option value="custom">Custom Interval</option>
                  </select>
                </div>

                {/* Recurrence Interval (Custom or standard intervals) */}
                {recurrenceType !== 'none' && (
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1.5 block">
                      Repeat Every (Interval)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={recurrenceInterval}
                        onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                        className="input-glass w-full px-3 py-2 text-sm text-white"
                      />
                      <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                        {recurrenceType === 'daily' && 'day(s)'}
                        {recurrenceType === 'weekly' && 'week(s)'}
                        {recurrenceType === 'monthly' && 'month(s)'}
                        {recurrenceType === 'weekdays' && 'week(s)'}
                        {recurrenceType === 'custom' && 'day(s)'}
                      </span>
                    </div>
                    {errors.recurrenceInterval && (
                      <p className="text-xs text-red-500 mt-1">{errors.recurrenceInterval}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Specific Weekdays selection */}
              {recurrenceType === 'weekdays' && (
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Select Weekdays</label>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((day) => {
                      const selected = recurrenceWeekdays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => toggleWeekday(day.id)}
                          className="px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all"
                          style={{
                            background: selected ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
                            color: selected ? '#a855f7' : '#9ca3af',
                            borderColor: selected ? '#a855f7' : 'rgba(255,255,255,0.05)',
                          }}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  {errors.recurrenceWeekdays && (
                    <p className="text-xs text-red-500 mt-1">{errors.recurrenceWeekdays}</p>
                  )}
                </div>
              )}

              {/* End Behavior */}
              {recurrenceType !== 'none' && (
                <div className="border-t border-white/5 pt-3 space-y-3">
                  <div className="flex gap-4">
                    <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="endType"
                        checked={recurrenceEndType === 'never'}
                        onChange={() => setRecurrenceEndType('never')}
                        className="accent-purple-500"
                      />
                      No End Date
                    </label>
                    <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="endType"
                        checked={recurrenceEndType === 'date'}
                        onChange={() => setRecurrenceEndType('date')}
                        className="accent-purple-500"
                      />
                      End On Date
                    </label>
                  </div>

                  {recurrenceEndType === 'date' && (
                    <div>
                      <input
                        type="date"
                        value={recurrenceEndDate}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        className="input-glass w-full px-3 py-2 text-sm text-white"
                        style={{ colorScheme: 'dark' }}
                      />
                      {errors.recurrenceEndDate && (
                        <p className="text-xs text-red-500 mt-1">{errors.recurrenceEndDate}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {errors.form && <p className="text-sm text-red-500 text-center">{errors.form}</p>}

            {/* Footer Buttons */}
            <div className="flex gap-3 border-t border-white/5 pt-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="btn-ghost flex-1 py-3 text-sm font-bold"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-neon flex-1 py-3 text-sm font-bold"
                disabled={saving}
              >
                {saving ? 'Saving...' : initialTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showSectionManager && (
        <TaskSectionManager onClose={() => setShowSectionManager(false)} />
      )}
    </>
  );
}
