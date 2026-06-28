import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { getLevelInfo } from "../lib/levels";

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

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

  if (!open) return null;

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      // Update local store
      updateProfile({
        display_name: displayName,
      });

      // Update Supabase profile
      await supabase
        .from('profiles')
        .update({
          display_name: displayName,
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
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="w-full max-w-md p-6 rounded-2xl"
        style={{
          background: 'rgba(15,15,25,0.95)',
          border: '1px solid rgba(168,85,247,0.2)',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="text-2xl font-bold"
              style={{ color: 'white' }}
            >
              Edit Profile
            </h2>

            <p
              className="text-sm mt-1"
              style={{ color: 'var(--text-muted)' }}
            >
              Manage your account details
            </p>
          </div>

          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label
              className="text-sm block mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Username
            </label>

            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-transparent border"
            />
          </div>

          <div>
            <label
              className="text-sm block mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Email
            </label>

            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 rounded-xl bg-transparent border opacity-60"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full btn-neon py-3 rounded-xl font-medium"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
