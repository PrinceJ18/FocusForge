import React from 'react';
import Modal from '../ui/Modal';
import { UserMinus } from 'lucide-react';

interface RemoveFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  friendName: string;
  loading?: boolean;
}

export default function RemoveFriendModal({
  isOpen,
  onClose,
  onConfirm,
  friendName,
  loading = false,
}: RemoveFriendModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Remove Friend?"
      maxWidth="sm"
      icon={<UserMinus size={20} className="text-red-400" />}
      footer={
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary font-semibold text-xs hover:bg-slate-800 hover:text-text-primary transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-text-primary font-semibold text-xs transition shadow-lg shadow-red-600/20 disabled:opacity-50"
          >
            {loading ? 'Removing...' : 'Remove'}
          </button>
        </div>
      }
    >
      <div className="space-y-3 text-xs text-text-secondary text-left">
        <p>
          Are you sure you want to remove <span className="font-bold text-text-primary">{friendName}</span> from your friends list?
        </p>
        <p className="text-text-muted bg-slate-800/40 p-3 rounded-xl border border-border/60">
          You will no longer appear in each other's Productivity Arena.
        </p>
      </div>
    </Modal>
  );
}
