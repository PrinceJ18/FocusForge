import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Trophy, Shield, Users, Sparkles } from 'lucide-react';
import { arenaService, Arena } from '../../services/arenaService';
import { activityService } from '../../services/activityService';

interface CreateArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onCreated: (arena: Arena) => void;
}

export default function CreateArenaModal({ isOpen, onClose, userId, onCreated }: CreateArenaModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'friends_only' | 'private'>('friends_only');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Arena name is required.');
      return;
    }
    if (trimmedName.length > 50) {
      setError('Arena name must be 50 characters or less.');
      return;
    }
    if (description.length > 200) {
      setError('Description must be 200 characters or less.');
      return;
    }

    setCreating(true);
    try {
      const arena = await arenaService.createArena(
        userId,
        trimmedName,
        description.trim() || null,
        visibility
      );

      // Log creation activity
      await activityService.logActivity(
        arena.id,
        userId,
        'friend_joined',
        'Created this Arena',
        `${trimmedName} is now live!`,
        { dedupe_key: `arena_created_${arena.id}` }
      ).catch(() => {}); // Non-fatal

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setName('');
        setDescription('');
        setVisibility('friends_only');
        onCreated(arena);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to create arena. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (creating) return;
    setName('');
    setDescription('');
    setVisibility('friends_only');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Arena"
      icon={<Trophy size={20} />}
      maxWidth="md"
    >
      {success ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/30 to-purple-500/30 border border-accent/40 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-accent animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-white">Arena Created!</h3>
          <p className="text-sm text-slate-400">Your friends have been auto-invited.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Arena Name */}
          <div className="space-y-1.5">
            <label htmlFor="arena-name" className="text-sm font-medium text-slate-300">
              Arena Name <span className="text-red-400">*</span>
            </label>
            <input
              id="arena-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Study Squad, Focus Warriors"
              maxLength={50}
              className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
              autoFocus
              disabled={creating}
            />
            <p className="text-xs text-slate-500 text-right">{name.length}/50</p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="arena-desc" className="text-sm font-medium text-slate-300">
              Description <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              id="arena-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this arena about?"
              maxLength={200}
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors resize-none"
              disabled={creating}
            />
            <p className="text-xs text-slate-500 text-right">{description.length}/200</p>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Visibility</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVisibility('friends_only')}
                disabled={creating}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
                  visibility === 'friends_only'
                    ? 'border-accent bg-accent/10 text-white shadow-lg shadow-accent/10'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Users size={20} className={visibility === 'friends_only' ? 'text-accent' : ''} />
                <span className="text-sm font-medium">Friends Only</span>
                <span className="text-xs text-slate-500">Only friends can join</span>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('private')}
                disabled={creating}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
                  visibility === 'private'
                    ? 'border-accent bg-accent/10 text-white shadow-lg shadow-accent/10'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Shield size={20} className={visibility === 'private' ? 'text-accent' : ''} />
                <span className="text-sm font-medium">Private</span>
                <span className="text-xs text-slate-500">Invite only</span>
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={creating} icon={Trophy}>
              Create Arena
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
