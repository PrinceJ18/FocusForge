import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileModal({
  open,
  onClose,
}: ProfileModalProps) {
  const { profile, user, updateProfile } = useStore();

  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    
    if (!displayName.trim()) {
      setError('Username cannot be empty');
      return;
    }
    
    if (displayName.length > 30) {
      setError('Username must be 30 characters or less');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Update local store
      updateProfile({
        display_name: displayName.trim(),
      });

      // Update Supabase profile
      await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      onClose();
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Edit Profile"
      subtitle="Manage your account details"
      maxWidth="md"
    >
      <div className="space-y-4 text-left">
        {error && <div className="text-red-400 bg-red-400/10 p-2 rounded-lg text-sm">{error}</div>}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Username
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-100 placeholder-slate-400 text-sm outline-none focus:border-purple-500 transition"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-4 py-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-slate-400 text-sm opacity-70 cursor-not-allowed"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          isLoading={saving}
          className="w-full btn-neon py-3 rounded-xl font-medium"
        >
          Save Changes
        </Button>
      </div>
    </Modal>
  );
}

