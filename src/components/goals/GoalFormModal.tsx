import React, { useState, useEffect } from 'react';
import { Target, AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatLocalDate } from '../../lib/dateUtils';
import { suggestDeadline, formatGoalPeriod } from './goalsUiUtils';
import type {
  Goal,
  GoalPeriod,
  GoalProgressMethod,
  CreateGoalInput,
  UpdateGoalInput,
} from '../../types/goals';

interface GoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGoal?: Goal;
  onSave: (data: CreateGoalInput | UpdateGoalInput) => Promise<void>;
}

const PERIODS: GoalPeriod[] = ['daily', 'weekly', 'monthly', 'custom', 'long_term'];

export default function GoalFormModal({
  isOpen,
  onClose,
  initialGoal,
  onSave,
}: GoalFormModalProps) {
  const isEditing = !!initialGoal;

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [period, setPeriod] = useState<GoalPeriod>('weekly');
  const [progressMethod, setProgressMethod] = useState<GoalProgressMethod>('milestone');
  const [manualProgressPct, setManualProgressPct] = useState(0);
  const [startDate, setStartDate] = useState(formatLocalDate(new Date()));
  const [deadline, setDeadline] = useState<string>('');
  const [isStrict, setIsStrict] = useState(false);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Initialize or reset form fields
  useEffect(() => {
    if (initialGoal) {
      setTitle(initialGoal.title);
      setDescription(initialGoal.description || '');
      setPeriod(initialGoal.period);
      setProgressMethod(initialGoal.progress_method);
      setManualProgressPct(initialGoal.manual_progress_pct);
      setStartDate(initialGoal.start_date);
      setDeadline(initialGoal.deadline || '');
      setIsStrict(initialGoal.is_strict);
    } else {
      const today = formatLocalDate(new Date());
      setTitle('');
      setDescription('');
      setPeriod('weekly');
      setProgressMethod('milestone');
      setManualProgressPct(0);
      setStartDate(today);
      setDeadline(suggestDeadline('weekly') || '');
      setIsStrict(false);
    }
    setErrors({});
  }, [initialGoal, isOpen]);

  // Handle period change and offer smart deadline suggestion
  const handlePeriodChange = (newPeriod: GoalPeriod) => {
    setPeriod(newPeriod);
    if (!isEditing && (!deadline || deadline === suggestDeadline(period))) {
      const suggested = suggestDeadline(newPeriod);
      if (suggested) setDeadline(suggested);
    }
  };

  // Form Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (deadline && startDate && deadline < startDate) {
      newErrors.deadline = 'Deadline cannot be earlier than start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || saving) return;

    try {
      setSaving(true);
      if (isEditing) {
        const updateData: UpdateGoalInput = {
          title: title.trim(),
          description: description.trim(),
          period,
          progress_method: progressMethod,
          manual_progress_pct: progressMethod === 'manual' ? manualProgressPct : 0,
          start_date: startDate,
          deadline: deadline || null,
          is_strict: isStrict,
        };
        await onSave(updateData);
      } else {
        const createData: CreateGoalInput = {
          title: title.trim(),
          description: description.trim(),
          period,
          progress_method: progressMethod,
          manual_progress_pct: progressMethod === 'manual' ? manualProgressPct : 0,
          start_date: startDate,
          deadline: deadline || null,
          is_strict: isStrict,
        };
        await onSave(createData);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Goal' : 'Create New Goal'}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="neon"
            onClick={handleSubmit}
            isLoading={saving}
            icon={Target}
          >
            {isEditing ? 'Save Changes' : 'Create Goal'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">
            Goal Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Master React 19 Concurrent Features"
            className="input-glass w-full px-3.5 py-2.5 text-xs text-text-primary"
            autoFocus
          />
          {errors.title && (
            <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
              <AlertCircle size={11} /> {errors.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">
            Description <span className="text-text-muted font-normal">(Optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What does success look like? Any specific deliverables or standards?"
            className="input-glass w-full px-3.5 py-2 text-xs text-text-primary resize-none"
          />
        </div>

        {/* Period Selector */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">
            Goal Horizon / Period
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 p-1 rounded-xl bg-background-card border border-border">
            {PERIODS.map((p) => {
              const active = period === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePeriodChange(p)}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all ${
                    active
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-muted hover:text-text-primary hover:bg-background-card-hover'
                  }`}
                >
                  {formatGoalPeriod(p)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress Method Selector */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">
            Progress Tracking Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setProgressMethod('milestone')}
              className={`p-3 rounded-xl border text-left transition-all ${
                progressMethod === 'milestone'
                  ? 'bg-primary/10 border-primary text-text-primary'
                  : 'bg-background-card border-border text-text-muted hover:border-border/80'
              }`}
            >
              <div className="font-bold text-xs text-text-primary">Milestone-Based</div>
              <div className="text-[10px] text-text-muted mt-0.5">
                Break goal into trackable milestones. Completing each earns +10 XP.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setProgressMethod('manual')}
              className={`p-3 rounded-xl border text-left transition-all ${
                progressMethod === 'manual'
                  ? 'bg-primary/10 border-primary text-text-primary'
                  : 'bg-background-card border-border text-text-muted hover:border-border/80'
              }`}
            >
              <div className="font-bold text-xs text-text-primary">Manual Percentage</div>
              <div className="text-[10px] text-text-muted mt-0.5">
                Track incremental progress with a percentage slider (0% to 100%).
              </div>
            </button>
          </div>
        </div>

        {/* Starting Manual Progress (if manual) */}
        {progressMethod === 'manual' && (
          <div className="p-3 rounded-xl bg-background-card-hover/40 border border-border">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-text-secondary">Initial Progress:</span>
              <span className="font-bold text-primary">{manualProgressPct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={manualProgressPct}
              onChange={(e) => setManualProgressPct(parseInt(e.target.value, 10))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>
        )}

        {/* Dates Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-glass w-full px-3.5 py-2 text-xs text-text-primary"
            />
          </div>

          {/* Deadline */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-text-secondary">
                Target Deadline <span className="text-text-muted font-normal">(Optional)</span>
              </label>
              {deadline && (
                <button
                  type="button"
                  onClick={() => setDeadline('')}
                  className="text-[10px] text-text-muted hover:text-text-primary"
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input-glass w-full px-3.5 py-2 text-xs text-text-primary"
            />
            {errors.deadline && (
              <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle size={11} /> {errors.deadline}
              </p>
            )}
          </div>
        </div>

        {/* Strict Mode Toggle */}
        <div className="p-3.5 rounded-xl border border-border bg-background-card-hover/30 flex items-start gap-3">
          <input
            id="strictModeToggle"
            type="checkbox"
            checked={isStrict}
            onChange={(e) => setIsStrict(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-purple-500 cursor-pointer"
          />
          <div className="flex-1">
            <label
              htmlFor="strictModeToggle"
              className="block text-xs font-bold text-text-primary cursor-pointer"
            >
              Strict Mode (Deadline Enforcement)
            </label>
            <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
              When enabled, completing the goal by its deadline awards an additional{' '}
              <span className="text-emerald-400 font-semibold">+25 early completion bonus XP</span>. If
              completed after the deadline, you still receive full base XP (+50 XP), but forfeit the
              early bonus.
            </p>
          </div>
        </div>
      </form>
    </Modal>
  );
}
