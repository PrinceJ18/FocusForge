import React, { useState, useEffect } from 'react';
import { Flag, Link as LinkIcon, AlertCircle, Plus } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { GoalMilestone, CreateMilestoneInput, UpdateMilestoneInput } from '../../types/goals';
import type { Task } from '../../store/slices/types';

interface MilestoneFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: string;
  initialMilestone?: GoalMilestone;
  availableTasks: Task[];
  onSave: (data: CreateMilestoneInput | UpdateMilestoneInput) => Promise<void>;
}

export default function MilestoneFormModal({
  isOpen,
  onClose,
  goalId,
  initialMilestone,
  availableTasks,
  onSave,
}: MilestoneFormModalProps) {
  const isEditing = !!initialMilestone;

  const [title, setTitle] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialMilestone) {
      setTitle(initialMilestone.title);
      setLinkedTaskId(initialMilestone.linked_task_id || '');
    } else {
      setTitle('');
      setLinkedTaskId('');
    }
    setError(null);
  }, [initialMilestone, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Milestone title is required');
      return;
    }

    try {
      setSaving(true);
      if (isEditing) {
        const updateData: UpdateMilestoneInput = {
          title: title.trim(),
          linked_task_id: linkedTaskId || null,
        };
        await onSave(updateData);
      } else {
        const createData: CreateMilestoneInput = {
          goal_id: goalId,
          title: title.trim(),
          linked_task_id: linkedTaskId || null,
        };
        await onSave(createData);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const selectedTask = availableTasks.find((t) => t.id === linkedTaskId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Milestone' : 'Add Milestone'}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="neon"
            onClick={handleSubmit}
            isLoading={saving}
            icon={isEditing ? Flag : Plus}
          >
            {isEditing ? 'Save Milestone' : 'Add Milestone'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">
            Milestone Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Complete Chapters 1–3 of system design notes"
            className="input-glass w-full px-3.5 py-2.5 text-xs text-text-primary"
            autoFocus
          />
          {error && (
            <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
              <AlertCircle size={11} /> {error}
            </p>
          )}
        </div>

        {/* Linked Task Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
              <LinkIcon size={12} className="text-primary" />
              Link to Task <span className="text-text-muted font-normal">(Optional)</span>
            </label>
            {linkedTaskId && (
              <button
                type="button"
                onClick={() => setLinkedTaskId('')}
                className="text-[10px] text-text-muted hover:text-text-primary"
              >
                Unlink
              </button>
            )}
          </div>

          <select
            value={linkedTaskId}
            onChange={(e) => setLinkedTaskId(e.target.value)}
            className="input-glass w-full px-3 py-2 text-xs text-text-primary"
            style={{ colorScheme: 'dark' }}
          >
            <option value="">None (Standalone milestone)</option>
            {availableTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title} {task.priority ? `(${task.priority})` : ''}
              </option>
            ))}
          </select>

          <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
            A task may be linked to at most one active milestone. Completed milestones release their
            linked task for reuse.
          </p>
        </div>

        {/* Selected Task Details preview */}
        {selectedTask && (
          <div className="p-2.5 rounded-xl bg-background-card-hover/40 border border-border text-xs flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-text-secondary font-medium truncate">{selectedTask.title}</p>
              <p className="text-[10px] text-text-muted mt-0.5">
                Priority: <span className="capitalize">{selectedTask.priority}</span>
                {selectedTask.scheduled_date ? ` • Scheduled: ${selectedTask.scheduled_date}` : ''}
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedTask.priority === 'high'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : selectedTask.priority === 'medium'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}
            >
              {selectedTask.priority}
            </span>
          </div>
        )}

        {/* Reward note */}
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-[11px] text-text-muted flex items-center justify-between">
          <span>Milestone Completion Reward</span>
          <span className="font-bold text-primary">+10 XP</span>
        </div>
      </form>
    </Modal>
  );
}
