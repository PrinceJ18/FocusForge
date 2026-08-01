import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { friendService } from '../../services/friendService';
import { Trophy, Flame, Clock, CheckCircle, Zap, ShieldAlert, Award, Calendar } from 'lucide-react';
import { LoadingState } from '../ui/Loading';
import { format, parseISO } from 'date-fns';

interface FriendProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendUserId: string | null;
}

export default function FriendProfileModal({ isOpen, onClose, friendUserId }: FriendProfileModalProps) {
  const [profileData, setProfileData] = useState<{
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    friend_code: string | null;
    level: number;
    xp: number;
    streak: number;
    focusMinutesThisWeek: number;
    tasksCompletedThisWeek: number;
    arenaScore: number;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && friendUserId) {
      setLoading(true);
      setError(null);
      friendService.getFriendProfilePreview(friendUserId)
        .then((data) => {
          setProfileData(data);
        })
        .catch((err) => {
          if (import.meta.env.DEV) {
            console.error('Failed to load friend profile preview:', err);
          }
          setError('Unable to load profile at this time. Please try again.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setProfileData(null);
    }
  }, [isOpen, friendUserId]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={profileData?.display_name || 'Friend Profile'}
      maxWidth="md"
      footer={
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800 hover:text-white transition"
        >
          Close Preview
        </button>
      }
    >
      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingState message="Loading profile preview..." />
        </div>
      ) : error ? (
        <div className="py-8 text-center text-xs text-red-400 space-y-2">
          <ShieldAlert size={28} className="mx-auto text-red-400 mb-2" />
          <p>{error}</p>
        </div>
      ) : profileData ? (
        <div className="space-y-5 text-xs text-left">
          {/* User Header Badge */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-pink-500/10 border border-purple-500/20 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-purple-500/30 shrink-0">
              {(profileData.display_name || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-100 truncate">
                {profileData.display_name || 'User'}
              </h3>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5 mb-1.5">
                {profileData.friend_code || '......'}
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold text-[10px]">
                  Level {profileData.level}
                </span>
                <span className="text-slate-400 text-[11px] font-bold flex items-center gap-1">
                  <Zap size={12} className="text-amber-400" /> {profileData.xp} XP
                </span>
              </div>
            </div>
          </div>

          {/* Public Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Arena Score */}
            <div className="p-3.5 bg-slate-800/50 rounded-xl border border-slate-700/60">
              <div className="flex items-center gap-2 text-purple-400 mb-1 font-semibold text-[11px]">
                <Trophy size={14} /> Arena Score
              </div>
              <div className="text-lg font-black text-slate-100">{profileData.arenaScore}</div>
            </div>

            {/* Streak */}
            <div className="p-3.5 bg-slate-800/50 rounded-xl border border-slate-700/60">
              <div className="flex items-center gap-2 text-amber-400 mb-1 font-semibold text-[11px]">
                <Flame size={14} /> Current Streak
              </div>
              <div className="text-lg font-black text-slate-100">{profileData.streak} days</div>
            </div>

            {/* Focus Minutes This Week */}
            <div className="p-3.5 bg-slate-800/50 rounded-xl border border-slate-700/60">
              <div className="flex items-center gap-2 text-cyan-400 mb-1 font-semibold text-[11px]">
                <Clock size={14} /> Focus This Week
              </div>
              <div className="text-lg font-black text-slate-100">{profileData.focusMinutesThisWeek}m</div>
            </div>

            {/* Tasks Completed This Week */}
            <div className="p-3.5 bg-slate-800/50 rounded-xl border border-slate-700/60">
              <div className="flex items-center gap-2 text-emerald-400 mb-1 font-semibold text-[11px]">
                <CheckCircle size={14} /> Tasks Completed
              </div>
              <div className="text-lg font-black text-slate-100">{profileData.tasksCompletedThisWeek}</div>
            </div>
          </div>

          <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl text-[10px] text-slate-400 italic text-center">
            🔒 Only public productivity achievements and level progress are visible. Private notes, tasks, expenses, and financial data are strictly protected.
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
