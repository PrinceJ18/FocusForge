import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { UserPlus, Check, Users, Loader2 } from 'lucide-react';
import { friendService } from '../../services/friendService';
import { arenaService, ArenaMember } from '../../services/arenaService';
import { supabase } from '../../lib/supabase';
import { activityService } from '../../services/activityService';
import { FriendWithProfile } from '../../types/friend';

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  arenaId: string;
  userId: string;
  onInvited: () => void;
}

interface FriendItem extends FriendWithProfile {
  /** The actual friend's user ID (not the current user's) */
  friendUserId: string;
  isAlreadyMember: boolean;
  isInOtherArena: boolean;
}

export default function InviteFriendsModal({ isOpen, onClose, arenaId, userId, onInvited }: InviteFriendsModalProps) {
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const loadFriends = useCallback(async () => {
    if (!isOpen || !userId || !arenaId) return;
    setLoading(true);
    setError('');
    try {
      const [friendsList, members] = await Promise.all([
        friendService.getFriends(userId),
        arenaService.getArenaMembers(arenaId),
      ]);

      const memberSet = new Set(members.map((m: ArenaMember) => m.user_id));

      // Build list with friend IDs resolved
      const friendsWithIds = friendsList.map(f => {
        const friendUserId = f.user_id === userId ? f.friend_id : f.user_id;
        return { ...f, friendUserId };
      });

      // Check which non-member friends are in another arena
      const nonMemberFriendIds = friendsWithIds
        .filter(f => !memberSet.has(f.friendUserId))
        .map(f => f.friendUserId);

      const inOtherArenaSet = new Set<string>();
      if (nonMemberFriendIds.length > 0) {
        const { data: otherMemberships } = await supabase
          .from('arena_members')
          .select('user_id')
          .in('user_id', nonMemberFriendIds)
          .is('left_at', null);

        (otherMemberships || []).forEach(m => inOtherArenaSet.add(m.user_id));
      }

      const mapped: FriendItem[] = friendsWithIds.map(f => ({
        ...f,
        isAlreadyMember: memberSet.has(f.friendUserId),
        isInOtherArena: inOtherArenaSet.has(f.friendUserId),
      }));

      // Sort: invitable first, then in-other-arena, then already-member
      mapped.sort((a, b) => {
        const priorityA = a.isAlreadyMember ? 2 : a.isInOtherArena ? 1 : 0;
        const priorityB = b.isAlreadyMember ? 2 : b.isInOtherArena ? 1 : 0;
        if (priorityA !== priorityB) return priorityA - priorityB;
        const nameA = a.profile?.display_name || '';
        const nameB = b.profile?.display_name || '';
        return nameA.localeCompare(nameB);
      });

      setFriends(mapped);
    } catch (err: any) {
      setError('Failed to load friends.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, userId, arenaId]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setSelected(new Set());
      setSuccessCount(null);
      setError('');
    }
  }, [isOpen]);

  const toggleFriend = (friendUserId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(friendUserId)) {
        next.delete(friendUserId);
      } else {
        next.add(friendUserId);
      }
      return next;
    });
  };

  const handleInvite = async () => {
    if (selected.size === 0) return;
    setInviting(true);
    setError('');
    try {
      const count = await arenaService.inviteFriends(arenaId, Array.from(selected));

      // Log activity for each invite
      for (const friendId of selected) {
        const friend = friends.find(f => f.friendUserId === friendId);
        const friendName = friend?.profile?.display_name || 'A friend';
        await activityService.logActivity(
          arenaId,
          userId,
          'friend_joined',
          `Invited ${friendName}`,
          null,
          { dedupe_key: `invite_${arenaId}_${friendId}` }
        ).catch(() => {}); // Non-fatal
      }

      setSuccessCount(count);
      setTimeout(() => {
        onInvited();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to invite friends.');
    } finally {
      setInviting(false);
    }
  };

  const invitableCount = friends.filter(f => !f.isAlreadyMember && !f.isInOtherArena).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={inviting ? () => {} : onClose}
      title="Invite Friends"
      icon={<UserPlus size={20} />}
      maxWidth="md"
    >
      {successCount !== null ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/30 to-accent/30 border border-green-500/40 flex items-center justify-center">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h3 className="text-xl font-bold text-white">
            {successCount} {successCount === 1 ? 'Friend' : 'Friends'} Invited!
          </h3>
          <p className="text-sm text-slate-400">They'll appear on the leaderboard.</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <p className="text-sm text-slate-400">Loading friends...</p>
        </div>
      ) : friends.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
          <Users className="w-12 h-12 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-300">No Friends Yet</h3>
          <p className="text-sm text-slate-500 max-w-xs">
            Add friends first from the Friends page, then come back to invite them.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {invitableCount === 0 ? (
            <div className="text-center py-8">
              <Check className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">All friends are already in this arena!</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Select friends to invite ({selected.size} selected)
            </p>
          )}

          <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {friends.map(friend => {
              const isSelected = selected.has(friend.friendUserId);
              const isUnavailable = friend.isAlreadyMember || friend.isInOtherArena;
              const disabled = isUnavailable || inviting;

              return (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => !disabled && toggleFriend(friend.friendUserId)}
                  disabled={disabled}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 text-left ${
                    isUnavailable
                      ? 'border-slate-800 bg-slate-800/30 opacity-50 cursor-not-allowed'
                      : isSelected
                      ? 'border-accent bg-accent/10 shadow-lg shadow-accent/5'
                      : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700 flex-shrink-0 border border-slate-600">
                    {friend.profile?.avatar_url ? (
                      <img src={friend.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-400">
                        {(friend.profile?.display_name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Name + Level */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {friend.profile?.display_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Level {friend.profile?.level || 1}
                    </p>
                  </div>

                  {/* Status Badge */}
                  {friend.isAlreadyMember ? (
                    <span className="text-xs text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700 flex-shrink-0">
                      In Arena
                    </span>
                  ) : friend.isInOtherArena ? (
                    <span className="text-xs text-amber-500/70 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 flex-shrink-0">
                      In Another Arena
                    </span>
                  ) : (
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected
                        ? 'border-accent bg-accent'
                        : 'border-slate-600'
                    }`}>
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          {/* Actions */}
          {invitableCount > 0 && (
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={inviting}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleInvite}
                disabled={selected.size === 0}
                isLoading={inviting}
                icon={UserPlus}
              >
                Invite {selected.size > 0 ? `(${selected.size})` : ''}
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
