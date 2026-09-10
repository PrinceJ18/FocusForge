import React, { useState, useEffect } from 'react';

interface MinimalProfile {
  display_name?: string | null;
  avatar_url?: string | null;
}

interface UserAvatarProps {
  profile?: MinimalProfile | null;
  email?: string | null;
  fallbackId?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function UserAvatar({ profile, email, fallbackId, size = 'md', className = '' }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Reset error state if avatar_url changes (e.g., user uploads a new one)
  useEffect(() => {
    setImgError(false);
  }, [profile?.avatar_url]);

  const sizeClasses = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  };

  const getInitials = () => {
    const name = profile?.display_name || email?.split('@')[0] || fallbackId || 'U';
    return name.substring(0, 1).toUpperCase();
  };

  const hasAvatar = !!profile?.avatar_url && !imgError;

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold shrink-0 overflow-hidden ${sizeClasses[size]} ${className}`}
      style={{
        background: hasAvatar ? 'transparent' : 'linear-gradient(135deg, var(--purple-primary), var(--pink-primary))',
        color: 'white',
      }}
    >
      {hasAvatar ? (
        <img
          src={profile.avatar_url!}
          alt="Avatar"
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        getInitials()
      )}
    </div>
  );
}
