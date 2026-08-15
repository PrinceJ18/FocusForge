import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { useArenaLeaderboard } from '../hooks/useArenaLeaderboard';
import { arenaService, Arena, ArenaMember } from '../services/arenaService';
import { activityService } from '../services/activityService';
import { LoadingState } from '../components/ui/Loading';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { Trophy, Clock, CheckCircle2, UserPlus, Crown, Calendar, Users, History, Activity, Swords, ArrowRight, Sparkles, LogOut, Trash2, Settings, ShieldAlert, UserMinus } from 'lucide-react';
import { useHallOfFame } from '../hooks/useHallOfFame';
import { useArenaActivity } from '../hooks/useArenaActivity';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import CreateArenaModal from '../components/arena/CreateArenaModal';
import InviteFriendsModal from '../components/arena/InviteFriendsModal';

export default function ArenaPage() {
  const { user } = useStore();
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('weekly');
  const [activeArena, setActiveArena] = useState<Arena | null>(null);
  const [loadingArena, setLoadingArena] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [members, setMembers] = useState<ArenaMember[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, { display_name: string | null; avatar_url: string | null }>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const loadArena = useCallback(async () => {
    if (!user) return;
    setLoadingArena(true);
    try {
      // 1. Get user's active arena membership
      const { data: memberData } = await supabase
        .from('arena_members')
        .select('arena_id')
        .eq('user_id', user.id)
        .is('left_at', null)
        .limit(1)
        .maybeSingle();

      if (memberData?.arena_id) {
        // 2. Fetch arena details by ID
        const { data: arenaData } = await supabase
          .from('arenas')
          .select('*')
          .eq('id', memberData.arena_id)
          .single();

        setActiveArena(arenaData as any ?? null);
      } else {
        setActiveArena(null);
      }
    } catch (err) {
      console.error('Failed to load arena:', err);
      setActiveArena(null);
    } finally {
      setLoadingArena(false);
    }
  }, [user]);

  useEffect(() => {
    loadArena();
  }, [loadArena]);

  // Load members when settings panel is open
  useEffect(() => {
    if (!showSettings || !activeArena) return;
    (async () => {
      try {
        const m = await arenaService.getArenaMembers(activeArena.id);
        setMembers(m);
        // Fetch profile info for each member
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', m.map(x => x.user_id));
        if (profiles) {
          const map: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
          profiles.forEach((p: any) => { map[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url }; });
          setMemberProfiles(map);
        }
      } catch {
        // Non-fatal
      }
    })();
  }, [showSettings, activeArena]);

  const isOwner = activeArena && user ? activeArena.owner_id === user.id : false;

  const handleRemoveMember = async (targetUserId: string) => {
    if (!activeArena || !user) return;
    setActionLoading(targetUserId);
    setActionError('');
    try {
      await arenaService.removeMember(activeArena.id, user.id, targetUserId);
      await activityService.logActivity(activeArena.id, user.id, 'member_removed', 'Removed a member', null, { dedupe_key: `remove_${targetUserId}` }).catch(() => {});
      setMembers(prev => prev.filter(m => m.user_id !== targetUserId));
    } catch (err: any) {
      setActionError(err?.message || 'Unable to remove member.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTransferOwnership = async (newOwnerId: string) => {
    if (!activeArena || !user) return;
    const confirmed = window.confirm('Are you sure you want to transfer ownership? This cannot be undone.');
    if (!confirmed) return;
    setActionLoading('transfer');
    setActionError('');
    try {
      await arenaService.transferOwnership(activeArena.id, user.id, newOwnerId);
      await activityService.logActivity(activeArena.id, user.id, 'owner_transferred', 'Transferred arena ownership', null, { dedupe_key: `transfer_${activeArena.id}` }).catch(() => {});
      await loadArena();
    } catch (err: any) {
      setActionError(err?.message || 'Unable to transfer ownership.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteArena = async () => {
    if (!activeArena || !user) return;
    const confirmed = window.confirm('Are you sure you want to delete this arena? All members, scores, and history will be permanently removed.');
    if (!confirmed) return;
    setActionLoading('delete');
    setActionError('');
    try {
      await arenaService.deleteArena(activeArena.id, user.id);
      setActiveArena(null);
      setShowSettings(false);
    } catch (err: any) {
      setActionError(err?.message || 'Unable to delete arena.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveArena = async () => {
    if (!activeArena || !user) return;
    const confirmed = window.confirm('Are you sure you want to leave this arena?');
    if (!confirmed) return;
    setActionLoading('leave');
    setActionError('');
    try {
      await arenaService.leaveArena(activeArena.id, user.id);
      await activityService.logActivity(activeArena.id, user.id, 'member_left', 'Left the arena', null, { dedupe_key: `leave_${user.id}` }).catch(() => {});
      setActiveArena(null);
      setShowSettings(false);
    } catch (err: any) {
      setActionError(err?.message || 'Unable to leave arena.');
    } finally {
      setActionLoading(null);
    }
  };

  const { leaderboard, currentUserRank, loading: loadingLeaderboard } = useArenaLeaderboard(
    activeArena?.id || null, 
    periodType
  );

  const { latestChampion, history, loading: loadingHoF, loadMore, hasMore, loadingMore } = useHallOfFame(
    activeArena?.id || null,
    periodType
  );

  const { activities, loading: loadingActivity, loadMore: loadMoreActivity, hasMore: hasMoreActivity, loadingMore: loadingMoreActivity } = useArenaActivity(
    activeArena?.id || null
  );

  const [activeCelebration, setActiveCelebration] = useState<string | null>(null);

  useEffect(() => {
    const handleCelebration = (e: Event) => {
      const customEvent = e as CustomEvent;
      setActiveCelebration(customEvent.detail.type);
      setTimeout(() => setActiveCelebration(null), 5000);
    };
    window.addEventListener('arena_celebration', handleCelebration);
    return () => window.removeEventListener('arena_celebration', handleCelebration);
  }, []);

  if (loadingArena || loadingLeaderboard) {
    return (
      <div className="py-16 flex justify-center">
        <LoadingState message="Loading Productivity Arena..." />
      </div>
    );
  }

  if (!activeArena) {
    return (
      <div className="page-enter max-w-2xl mx-auto space-y-8 pb-24">
        {/* Hero Onboarding Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-purple-950/30 to-slate-900 p-8 md:p-10 shadow-2xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 text-center space-y-5">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/20 to-purple-500/20 border border-accent/30 shadow-lg shadow-accent/10">
              <Trophy className="w-10 h-10 text-accent" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-black text-white tracking-tight">Productivity Arena</h1>
              <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
                Compete with friends on focus time, tasks completed, and daily challenges. Create an arena and start climbing the leaderboard.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              icon={Swords}
              onClick={() => setShowCreateModal(true)}
              className="mt-4 shadow-lg shadow-accent/20"
            >
              Create Arena
            </Button>
          </div>
        </div>

        {/* How It Works */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white px-1">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Swords, title: 'Create', desc: 'Start your own arena with a name and privacy setting.' },
              { icon: UserPlus, title: 'Invite', desc: 'Your friends are auto-added. Invite more anytime.' },
              { icon: Trophy, title: 'Compete', desc: 'Earn points from focus, tasks, and challenges.' },
            ].map((step, i) => (
              <div
                key={step.title}
                className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 space-y-3 hover:bg-white/[0.07] transition-colors group"
              >
                <div className="absolute top-3 right-3 text-xs font-bold text-slate-600">{i + 1}</div>
                <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                  <step.icon size={20} />
                </div>
                <h3 className="font-semibold text-white text-sm">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Create Arena Modal */}
        {user && (
          <CreateArenaModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            userId={user.id}
            onCreated={(arena) => {
              setActiveArena(arena);
            }}
          />
        )}
      </div>
    );
  }

  // Empty state handling is now inline below the header.

  const top3 = leaderboard.slice(0, 3);
  const others = leaderboard.slice(3);
  
  // Check if current user is in top 10
  const isCurrentUserInTop10 = currentUserRank !== null && currentUserRank <= 10;
  const showCurrentUserPinned = currentUserRank !== null && !isCurrentUserInTop10;

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-2xl" title="Gold">🥇</span>;
    if (rank === 2) return <span className="text-2xl" title="Silver">🥈</span>;
    if (rank === 3) return <span className="text-2xl" title="Bronze">🥉</span>;
    return <span className="text-lg font-bold text-gray-400">#{rank}</span>;
  };

  return (
    <div className="page-enter space-y-8 max-w-5xl mx-auto pb-24">
      {/* Header & Tabs */}
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
          {activeArena.name}
        </h1>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <div className="flex space-x-2 p-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
            <button
              onClick={() => setPeriodType('weekly')}
              className={clsx(
                "px-6 py-2 rounded-lg font-medium transition-all duration-300",
                periodType === 'weekly' ? "bg-accent text-white shadow-lg shadow-accent/25" : "text-gray-400 hover:text-white"
              )}
            >
              Weekly
            </button>
            <button
              onClick={() => setPeriodType('monthly')}
              className={clsx(
                "px-6 py-2 rounded-lg font-medium transition-all duration-300",
                periodType === 'monthly' ? "bg-accent text-white shadow-lg shadow-accent/25" : "text-gray-400 hover:text-white"
              )}
            >
              Monthly
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={UserPlus}
            onClick={() => setShowInviteModal(true)}
          >
            Invite Friends
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={Settings}
            onClick={() => setShowSettings(!showSettings)}
          >
            Settings
          </Button>
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No Leaderboard Data Yet"
          description="Invite friends and start focusing to earn points!"
        />
      ) : (
        <>
          {/* TOP 3 PODIUM */}
      <div className="flex justify-center items-end space-x-4 md:space-x-8 mt-12 mb-16">
        {/* Silver (Rank 2) */}
        {top3[1] && (
          <div className="flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            {getRankBadge(2)}
            <div className="mt-2 w-16 h-16 rounded-full overflow-hidden border-2 border-gray-300 shadow-[0_0_15px_rgba(209,213,219,0.3)] bg-gray-800">
              {top3[1].profile?.avatar_url ? (
                <img src={top3[1].profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-bold">
                  {(top3[1].profile?.display_name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="mt-4 bg-gradient-to-b from-gray-300/20 to-transparent w-24 h-24 rounded-t-lg border-t-2 border-gray-300/50 flex flex-col items-center pt-2">
              <span className="font-bold text-white truncate w-full text-center px-1 text-sm">{top3[1].profile?.display_name}</span>
              <span className="text-accent font-bold mt-1">{top3[1].total_score}</span>
            </div>
          </div>
        )}

        {/* Gold (Rank 1) */}
        {top3[0] && (
          <div className="flex flex-col items-center animate-fade-in-up z-10" style={{ animationDelay: '0ms' }}>
            {getRankBadge(1)}
            <div className="mt-2 w-20 h-20 rounded-full overflow-hidden border-4 border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.5)] bg-gray-800 relative">
              {top3[0].profile?.avatar_url ? (
                <img src={top3[0].profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-yellow-400 text-2xl font-bold">
                  {(top3[0].profile?.display_name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="mt-4 bg-gradient-to-b from-yellow-400/30 to-transparent w-28 h-32 rounded-t-lg border-t-4 border-yellow-400 flex flex-col items-center pt-3">
              <span className="font-bold text-white truncate w-full text-center px-1">{top3[0].profile?.display_name}</span>
              <span className="text-yellow-400 font-black text-lg mt-1">{top3[0].total_score}</span>
            </div>
          </div>
        )}

        {/* Bronze (Rank 3) */}
        {top3[2] && (
          <div className="flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            {getRankBadge(3)}
            <div className="mt-2 w-16 h-16 rounded-full overflow-hidden border-2 border-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.3)] bg-gray-800">
              {top3[2].profile?.avatar_url ? (
                <img src={top3[2].profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-amber-600 text-xl font-bold">
                  {(top3[2].profile?.display_name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="mt-4 bg-gradient-to-b from-amber-600/20 to-transparent w-24 h-20 rounded-t-lg border-t-2 border-amber-600/50 flex flex-col items-center pt-2">
              <span className="font-bold text-white truncate w-full text-center px-1 text-sm">{top3[2].profile?.display_name}</span>
              <span className="text-amber-500 font-bold mt-1">{top3[2].total_score}</span>
            </div>
          </div>
        )}
      </div>

      {/* LEADERBOARD TABLE */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                <th className="px-6 py-4 font-semibold text-center w-20">Rank</th>
                <th className="px-6 py-4 font-semibold">Member</th>
                <th className="px-6 py-4 font-semibold text-center hidden sm:table-cell">Lvl</th>
                <th className="px-6 py-4 font-semibold text-center">Focus</th>
                <th className="px-6 py-4 font-semibold text-center">Tasks</th>
                <th className="px-6 py-4 font-semibold text-right text-accent">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leaderboard.slice(0, 10).map((entry, idx) => {
                const rank = idx + 1;
                const isMe = entry.user_id === user?.id;
                
                return (
                  <tr 
                    key={entry.id} 
                    className={clsx(
                      "transition-colors hover:bg-white/5",
                      isMe ? "bg-accent/10 border-l-4 border-l-accent" : "border-l-4 border-l-transparent"
                    )}
                  >
                    <td className="px-6 py-4 text-center font-bold text-gray-400">
                      {rank}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
                          {entry.profile?.avatar_url ? (
                            <img src={entry.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
                              {(entry.profile?.display_name || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className={clsx("font-medium truncate max-w-[120px] sm:max-w-[200px]", isMe ? "text-white" : "text-gray-200")}>
                          {entry.profile?.display_name || 'Unknown User'}
                          {isMe && <span className="ml-2 text-xs text-accent px-2 py-0.5 rounded-full bg-accent/20">You</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center hidden sm:table-cell text-sm text-gray-400">
                      {entry.profile?.level || 1}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-300">
                      <div className="flex items-center justify-center space-x-1">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <span>{Math.floor(entry.focus_points / 1)}m</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-300">
                      <div className="flex items-center justify-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-gray-500" />
                        <span>{Math.floor(entry.task_points / 25)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-white text-lg">
                      {entry.total_score}
                    </td>
                  </tr>
                );
              })}

              {/* Pinned Current User (If outside top 10) */}
              {showCurrentUserPinned && (() => {
                const myEntry = leaderboard[currentUserRank! - 1];
                if (!myEntry) return null;
                
                return (
                  <>
                    <tr>
                      <td colSpan={6} className="px-6 py-2 text-center text-gray-500 bg-white/[0.02]">
                        <div className="flex items-center justify-center space-x-4">
                          <div className="h-px w-8 bg-gray-700"></div>
                          <span className="text-xs font-bold tracking-widest">...</span>
                          <div className="h-px w-8 bg-gray-700"></div>
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-accent/10 border-l-4 border-l-accent border-t border-white/10">
                      <td className="px-6 py-4 text-center font-bold text-accent">
                        {currentUserRank}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
                            {myEntry.profile?.avatar_url ? (
                              <img src={myEntry.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-accent">
                                {(myEntry.profile?.display_name || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="font-medium text-white truncate max-w-[120px] sm:max-w-[200px]">
                            {myEntry.profile?.display_name || 'Unknown User'}
                            <span className="ml-2 text-xs text-accent px-2 py-0.5 rounded-full bg-accent/20">You</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center hidden sm:table-cell text-sm text-gray-400">
                        {myEntry.profile?.level || 1}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-300">
                        <div className="flex items-center justify-center space-x-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span>{Math.floor(myEntry.focus_points / 1)}m</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-300">
                        <div className="flex items-center justify-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-gray-500" />
                          <span>{Math.floor(myEntry.task_points / 25)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-white text-lg">
                        {myEntry.total_score}
                      </td>
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* CURRENT CHAMPION CARD */}
      {latestChampion && (
        <div className="mt-12 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-2xl p-6 md:p-8 animate-fade-in shadow-[0_0_30px_rgba(250,204,21,0.05)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Crown className="w-32 h-32 text-yellow-400" />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)] bg-gray-800 flex-shrink-0">
              {latestChampion.avatar_url_snapshot ? (
                <img src={latestChampion.avatar_url_snapshot} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-yellow-400">
                  {(latestChampion.display_name_snapshot || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="inline-flex items-center space-x-2 bg-yellow-400/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-bold mb-2">
                <Crown className="w-4 h-4" />
                <span>{periodType === 'weekly' ? 'Current Weekly Champion' : 'Current Monthly Champion'}</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white">{latestChampion.display_name_snapshot || 'Unknown'}</h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-gray-400 mt-2">
                <span className="flex items-center space-x-1">
                  <span className="font-bold text-gray-300">Level {latestChampion.level_snapshot}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1 text-yellow-400 font-bold">
                  <span>{latestChampion.total_score} pts</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>{latestChampion.period_start} to {latestChampion.period_end}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HALL OF FAME HISTORY */}
      <div className="mt-16 space-y-6">
        <div className="flex items-center space-x-2 text-white px-2">
          <History className="w-6 h-6 text-accent" />
          <h2 className="text-2xl font-bold">Hall of Fame</h2>
        </div>
        
        {history.length === 0 ? (
          <EmptyState
            icon={History}
            title="No History Yet"
            description="No past champions archived yet for this period type."
          />
        ) : (
          <div className="relative w-full overflow-x-auto pb-4 custom-scrollbar">
            <div className="flex space-x-4 min-w-max px-2">
              {history.map((entry) => (
                <div key={entry.id} className="w-72 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors flex flex-col space-y-4 shadow-lg">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-600 bg-gray-800">
                      {entry.avatar_url_snapshot ? (
                        <img src={entry.avatar_url_snapshot} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-400">
                          {(entry.display_name_snapshot || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 font-medium">{entry.period_start}</div>
                      <div className="text-xs text-gray-500 font-medium border-t border-white/5 pt-0.5 mt-0.5">{entry.period_end}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-white text-lg truncate" title={entry.display_name_snapshot || 'Unknown'}>
                      {entry.display_name_snapshot || 'Unknown'}
                    </h3>
                    <div className="text-sm text-gray-400">Level {entry.level_snapshot}</div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <div className="text-xl font-black text-accent">{entry.total_score} <span className="text-xs font-normal text-gray-500">pts</span></div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500" title="Arena Members during this period">
                      <Users className="w-3 h-3" />
                      <span>{entry.member_count}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {hasMore && (
                <div className="w-48 flex items-center justify-center">
                  <Button 
                    variant="outline"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-6 py-3 font-medium"
                  >
                    {loadingMore ? 'Loading...' : 'Load Older'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RECENT ACTIVITY FEED */}
      <div className="mt-16 space-y-6">
        <div className="flex items-center space-x-2 text-white px-2">
          <Activity className="w-6 h-6 text-accent" />
          <h2 className="text-2xl font-bold">Recent Activity</h2>
        </div>
        
        {activities.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No Activity"
            description="No recent activity to show."
          />
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-xl">
            <div className="divide-y divide-white/5">
              {activities.map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-white/5 transition-colors flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-600 bg-gray-800 flex-shrink-0">
                    {activity.profile?.avatar_url ? (
                      <img src={activity.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400">
                        {(activity.profile?.display_name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">
                      <span className="font-bold">{activity.profile?.display_name || 'Unknown'}</span>{' '}
                      <span className="text-gray-300">{activity.title}</span>
                    </p>
                    {activity.description && (
                      <p className="text-gray-400 text-xs mt-1">{activity.description}</p>
                    )}
                    <div className="text-xs text-gray-500 mt-2 font-medium">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex-shrink-0 pt-1">
                    {activity.activity_type.includes('champion') && <Crown className="w-5 h-5 text-yellow-400" />}
                    {activity.activity_type.includes('focus') && <Clock className="w-5 h-5 text-accent" />}
                    {activity.activity_type.includes('task') && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                    {activity.activity_type.includes('level') && <Trophy className="w-5 h-5 text-amber-500" />}
                    {activity.activity_type.includes('friend') && <UserPlus className="w-5 h-5 text-blue-400" />}
                  </div>
                </div>
              ))}
            </div>
            
            {hasMoreActivity && (
              <div className="p-4 border-t border-white/10 flex justify-center bg-white/[0.02]">
                <Button 
                  variant="outline"
                  onClick={loadMoreActivity}
                  disabled={loadingMoreActivity}
                  className="px-6 py-2 text-sm font-medium"
                >
                  {loadingMoreActivity ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CELEBRATION TOAST / OVERLAY */}
      {activeCelebration && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-bounce-short">
          <div className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 backdrop-blur-xl border border-yellow-400/50 shadow-[0_0_40px_rgba(250,204,21,0.4)] rounded-full px-6 py-3 flex items-center space-x-3 text-white">
            <Crown className="w-6 h-6 text-yellow-200" />
            <span className="font-bold text-lg">
              {activeCelebration === 'weekly_champion' && 'New Weekly Champion Crowned!'}
              {activeCelebration === 'monthly_champion' && 'New Monthly Champion Crowned!'}
              {activeCelebration === 'level_up' && 'Level Up Reached!'}
              {activeCelebration === 'personal_best' && 'New Personal Best Score!'}
              {activeCelebration === 'new_badge' && 'New Badge Earned!'}
            </span>
            <Trophy className="w-6 h-6 text-yellow-200" />
          </div>
        </div>
      )}

      {/* Invite Friends Modal */}
      {user && activeArena && (
        <InviteFriendsModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          arenaId={activeArena.id}
          userId={user.id}
          onInvited={() => loadArena()}
        />
      )}

      {/* ARENA SETTINGS PANEL */}
      {showSettings && activeArena && user && (
        <div className="mt-16 space-y-6">
          <div className="flex items-center space-x-2 text-white px-2">
            <Settings className="w-6 h-6 text-accent" />
            <h2 className="text-2xl font-bold">Arena Settings</h2>
          </div>

          {actionError && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5">
              {actionError}
            </div>
          )}

          {/* Members List */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" /> Members ({members.length})
              </h3>
            </div>
            <div className="divide-y divide-white/5">
              {members.map(member => {
                const profile = memberProfiles[member.user_id];
                const isSelf = member.user_id === user.id;
                const isMemberOwner = member.user_id === activeArena.owner_id;

                return (
                  <div key={member.id} className="px-6 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 flex-shrink-0 border border-gray-600">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
                          {(profile?.display_name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-white truncate block">
                        {profile?.display_name || 'Unknown User'}
                        {isSelf && <span className="ml-2 text-xs text-accent">You</span>}
                      </span>
                    </div>
                    {isMemberOwner && (
                      <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20 flex items-center gap-1">
                        <Crown className="w-3 h-3" /> Owner
                      </span>
                    )}
                    {isOwner && !isSelf && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTransferOwnership(member.user_id)}
                          disabled={actionLoading !== null}
                          className="text-xs text-amber-400 hover:text-amber-300 transition-colors px-2 py-1 rounded-lg hover:bg-amber-400/10"
                          title="Transfer Ownership"
                        >
                          <Crown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          disabled={actionLoading === member.user_id}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded-lg hover:bg-red-400/10"
                          title="Remove Member"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Danger Zone
            </h3>
            <div className="flex flex-wrap gap-3">
              {!isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={LogOut}
                  onClick={handleLeaveArena}
                  isLoading={actionLoading === 'leave'}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  Leave Arena
                </Button>
              )}
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={Trash2}
                  onClick={handleDeleteArena}
                  isLoading={actionLoading === 'delete'}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  Delete Arena
                </Button>
              )}
            </div>
            {isOwner && (
              <p className="text-xs text-slate-500">Transfer ownership to another member before leaving. Deleting removes all data permanently.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
