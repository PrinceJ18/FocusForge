import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { UserAvatar } from './ui/UserAvatar';
import { Upload, X, Loader2 } from 'lucide-react';

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
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const file = e.target.files[0];

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL with cache busting
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      // Update Supabase and local store
      await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCacheBuster })
        .eq('id', user.id);

      updateProfile({ avatar_url: urlWithCacheBuster });

    } catch (err: any) {
      console.error('Upload failed', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!user) return;
    setUploadingImage(true);
    try {
      await supabase
        .from('profiles')
        .update({ avatar_url: '' })
        .eq('id', user.id);

      updateProfile({ avatar_url: '' });
    } catch (err) {
      console.error('Failed to remove image', err);
    } finally {
      setUploadingImage(false);
    }
  };

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
      <div className="space-y-6 text-left">
        {error && <div className="text-red-400 bg-red-400/10 p-2 rounded-lg text-sm">{error}</div>}

        {/* Avatar Section */}
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative group">
            <UserAvatar profile={profile} email={user?.email} size="xl" className="border-4 border-slate-800 shadow-xl" />
            {uploadingImage && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm z-10">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <label className="relative overflow-hidden cursor-pointer">
              <Button size="sm" variant="secondary" className="flex items-center gap-2 pointer-events-none" disabled={uploadingImage}>
                <Upload size={14} />
                Change Photo
              </Button>
              <input 
                type="file" 
                accept="image/jpeg, image/png, image/webp" 
                onChange={handleImageUpload} 
                disabled={uploadingImage}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>
            
            {profile?.avatar_url && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleRemoveImage}
                disabled={uploadingImage}
                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
              >
                <X size={14} />
              </Button>
            )}
          </div>
        </div>
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

