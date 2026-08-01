import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, Search, UserPlus, UserCheck, UserX, Copy, Check, Shield, Flame, 
  Trophy, Award, ArrowUpRight, Clock, AlertCircle, RefreshCcw 
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useFriends } from '../hooks/useFriends';
import { useFriendRequests } from '../hooks/useFriendRequests';
import { friendService } from '../services/friendService';
import FriendProfileModal from '../components/friends/FriendProfileModal';
import RemoveFriendModal from '../components/friends/RemoveFriendModal';
import { format, parseISO } from 'date-fns';
import { LoadingState } from '../components/ui/Loading';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';

export default function Friends() {
  const { user, profile, showNotification } = useStore();
  const { friends, loading: loadingFriends, error: errorFriends, refresh: refreshFriends, removeFriend } = useFriends();
  const { incomingRequests, outgoingRequests, loading: loadingRequests, refresh: refreshRequests, sendRequest, respondToRequest, cancelRequest } = useFriendRequests();

  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'discover'>('friends');
  
  // Search State for Discover tab & global filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    friend_code: string | null;
    level?: number;
    xp?: number;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Friend Code State
  const [myFriendCode, setMyFriendCode] = useState<string>(profile.friend_code || '');
  const [copiedCode, setCopiedCode] = useState(false);

  // Modals State
  const [selectedFriendIdForPreview, setSelectedFriendIdForPreview] = useState<string | null>(null);
  const [selectedFriendForRemoval, setSelectedFriendForRemoval] = useState<{ id: string; name: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Action Loading states per user ID
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  // 300ms Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Friend Code for Current User if not present
  useEffect(() => {
    if (user && !profile.friend_code) {
      friendService.getFriendCode(user.id).then((code) => {
        setMyFriendCode(code);
      }).catch(console.error);
    } else if (profile.friend_code) {
      setMyFriendCode(profile.friend_code);
    }
  }, [user, profile.friend_code]);

  // Execute Search when debouncedQuery updates
  useEffect(() => {
    if (!debouncedQuery || !user) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    friendService.searchUsers(debouncedQuery, user.id)
      .then((results) => {
        setSearchResults(results);
      })
      .catch((err) => {
        console.error('Search error:', err);
        showNotification({ type: 'error', title: 'Search Error', message: 'Unable to search users. Please try again.' });
      })
      .finally(() => {
        setIsSearching(false);
      });
  }, [debouncedQuery, user, showNotification]);

  // Copy Friend Code to Clipboard
  const handleCopyCode = () => {
    if (!myFriendCode) return;
    navigator.clipboard.writeText(myFriendCode);
    setCopiedCode(true);
    showNotification({ type: 'info', title: 'Friend Code Copied', message: 'Friend code copied to clipboard!' });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Handle Send Friend Request
  const handleSendRequest = async (targetUserId: string) => {
    setActionUserId(targetUserId);
    try {
      await sendRequest(targetUserId);
      showNotification({ type: 'success', title: 'Request Sent', message: 'Friend request sent successfully!' });
    } catch (err: any) {
      showNotification({ type: 'error', title: 'Action Failed', message: err.message || 'Failed to send friend request' });
    } finally {
      setActionUserId(null);
    }
  };

  // Handle Respond to Request (Accept / Reject)
  const handleRespondRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    setActionUserId(requestId);
    try {
      await respondToRequest(requestId, status);
      await refreshFriends();
      showNotification({ 
        type: status === 'accepted' ? 'success' : 'info', 
        title: status === 'accepted' ? 'Friend Added' : 'Request Declined', 
        message: status === 'accepted' ? 'Friend request accepted!' : 'Friend request declined.' 
      });
    } catch (err: any) {
      showNotification({ type: 'error', title: 'Action Failed', message: err.message || 'Failed to respond to request' });
    } finally {
      setActionUserId(null);
    }
  };

  // Handle Cancel Outgoing Request
  const handleCancelRequest = async (requestId: string) => {
    setActionUserId(requestId);
    try {
      await cancelRequest(requestId);
      showNotification({ type: 'info', title: 'Request Cancelled', message: 'Outgoing friend request cancelled.' });
    } catch (err: any) {
      showNotification({ type: 'error', title: 'Action Failed', message: err.message || 'Failed to cancel request' });
    } finally {
      setActionUserId(null);
    }
  };

  // Confirm Removal of Friend
  const handleConfirmRemoveFriend = async () => {
    if (!selectedFriendForRemoval) return;
    setIsRemoving(true);
    try {
      await removeFriend(selectedFriendForRemoval.id);
      showNotification({ type: 'info', title: 'Friend Removed', message: 'Friend removed successfully.' });
      setSelectedFriendForRemoval(null);
    } catch (err: any) {
      showNotification({ type: 'error', title: 'Action Failed', message: err.message || 'Failed to remove friend' });
    } finally {
      setIsRemoving(false);
    }
  };

  // Filter Active Friends List based on Search Query
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase().trim();
    return friends.filter((f) => {
      const name = f.profile?.display_name || '';
      return name.toLowerCase().includes(q);
    });
  }, [friends, searchQuery]);

  return (
    <div className="page-enter space-y-6 text-left">
      {/* HEADER & FRIEND CODE CONTAINER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <Users size={18} />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Friends & Community</h2>
          </div>
          <p className="text-xs text-slate-400">Connect with friends, build your productivity network, and grow together through healthy competition.</p>
        </div>

        {/* User's Own Friend Code Widget */}
        <div className="p-3.5 bg-slate-900/80 rounded-xl border border-purple-500/30 flex items-center justify-between gap-4 shrink-0 shadow-lg shadow-purple-950/20">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Your Friend Code</div>
            <div className="text-base font-black text-purple-300 tracking-widest font-mono mt-0.5">{myFriendCode || '......'}</div>
          </div>
          <Button
            variant="ghost"
            onClick={handleCopyCode}
            className="py-2 text-xs font-semibold"
            title="Copy Friend Code"
            icon={copiedCode ? Check : Copy}
          >
            <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
          </Button>
        </div>
      </div>

      {/* SEARCH BAR & TABS BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap min-h-[44px] touch-target ${
              activeTab === 'friends'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 min-h-[44px] touch-target ${
              activeTab === 'requests'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Requests</span>
            {incomingRequests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center font-bold">
                {incomingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap min-h-[44px] touch-target ${
              activeTab === 'discover'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Discover
          </button>
        </div>

        {/* Search Bar Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'discover' ? "Search by Username or Friend Code (e.g. AB7KQ2)..." : "Filter friends..."}
            className="input-glass w-full pl-10 pr-4 py-2.5"
          />
        </div>
      </div>

      {/* TAB 1: FRIENDS LIST */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          {loadingFriends ? (
            <div className="py-12"><LoadingState message="Loading your friends list..." /></div>
          ) : errorFriends ? (
            <div className="p-6 text-center text-xs text-red-400 glass-card space-y-2">
              <AlertCircle size={24} className="mx-auto" />
              <p>{errorFriends}</p>
              <button onClick={() => refreshFriends()} className="btn-ghost px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1 mt-2">
                <RefreshCcw size={12} /> Retry
              </button>
            </div>
          ) : filteredFriends.length === 0 ? (
            <EmptyState
              icon={Users}
              title={searchQuery ? 'No matching friends found' : "You haven't added any friends yet."}
              description={searchQuery ? 'Try adjusting your search filter.' : 'Search for friends using their username or unique 7-character Friend Code in the Discover tab.'}
              action={!searchQuery ? {
                label: "Add Friend",
                onClick: () => setActiveTab('discover'),
                icon: UserPlus,
                variant: 'neon'
              } : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFriends.map((f) => {
                const displayName = f.profile?.display_name || 'Friend';
                const friendCode = f.profile?.friend_code || '......';
                const level = f.profile?.level || Math.floor(Math.sqrt((f.profile?.xp || 0) / 100)) + 1;
                const xp = f.profile?.xp || 0;
                const streak = f.profile?.streak || 0;
                const arenaScore = Math.round(xp * 1.2 + streak * 50);
                const friendSince = f.created_at ? format(parseISO(f.created_at), 'MMM d, yyyy') : 'Recently';

                return (
                  <div key={f.id} className="glass-card p-4 flex flex-col justify-between space-y-4 hover:border-purple-500/30 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-base shadow-md shrink-0">
                        {displayName[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-100 truncate">{displayName}</h4>
                        <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5 mb-1.5">
                          {friendCode}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                            Level {level}
                          </span>
                          <span className="text-[11px] text-slate-400 font-semibold">{xp} XP</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 border-t border-slate-800/80 pt-2">
                      <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-800/40">
                        <Trophy size={12} className="text-purple-400" /> 
                        <span className="font-bold">{arenaScore}</span> Score
                      </div>
                      <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-800/40">
                        <Flame size={12} className="text-amber-400" /> 
                        <span className="font-bold">{streak}</span> Streak
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                      <span>Friend since {friendSince}</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="secondary"
                        onClick={() => setSelectedFriendIdForPreview(f.friend_id)}
                        className="flex-1 py-2 text-xs font-semibold"
                      >
                        View Profile
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setSelectedFriendForRemoval({ id: f.friend_id, name: displayName })}
                        className="px-3 py-2 text-xs font-semibold"
                        title="Remove Friend"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FRIEND REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {loadingRequests ? (
            <div className="py-12"><LoadingState message="Loading friend requests..." /></div>
          ) : (
            <>
              {/* INCOMING REQUESTS SECTION */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <UserPlus size={14} className="text-purple-400" /> Incoming Requests ({incomingRequests.length})
                </h3>

                {incomingRequests.length === 0 ? (
                  <div className="p-6 bg-slate-900/40 rounded-xl border border-slate-800/80 text-center text-xs text-slate-500">
                    No pending friend requests.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {incomingRequests.map((req) => {
                      const displayName = req.sender?.display_name || 'User';
                      const friendCode = req.sender?.friend_code || '......';
                      const level = req.sender?.level || 1;
                      const xp = req.sender?.xp || 0;
                      const streak = req.sender?.streak || 0;

                      return (
                        <div key={req.id} className="glass-card p-4 flex flex-col justify-between space-y-4 hover:border-purple-500/30 transition">
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-base shadow-md shrink-0">
                              {displayName[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-slate-100 truncate">{displayName}</h4>
                              <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5 mb-1.5">
                                {friendCode}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                                  Level {level}
                                </span>
                                <span className="text-[11px] text-slate-400 font-semibold">{xp} XP</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                            <span>Sent {format(parseISO(req.created_at), 'MMM d, yyyy')}</span>
                            <span className="flex items-center gap-1 font-bold text-amber-400">
                              <Flame size={12} /> {streak} Streak
                            </span>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              variant="secondary"
                              onClick={() => setSelectedFriendIdForPreview(req.sender_id)}
                              className="px-2 py-2 text-xs font-semibold"
                              title="View Profile"
                            >
                              Profile
                            </Button>
                            <Button
                              onClick={() => handleRespondRequest(req.id, 'accepted')}
                              disabled={actionUserId === req.id}
                              className="flex-1 py-2 text-xs font-semibold"
                            >
                              Accept
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => handleRespondRequest(req.id, 'rejected')}
                              disabled={actionUserId === req.id}
                              className="px-2 py-2 text-xs font-semibold"
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* OUTGOING REQUESTS SECTION */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400" /> Sent Pending Requests ({outgoingRequests.length})
                </h3>

                {outgoingRequests.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title="No outgoing requests"
                    description="You haven't sent any friend requests."
                    className="p-6"
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {outgoingRequests.map((req) => {
                      const displayName = req.receiver?.display_name || 'User';
                      const friendCode = req.receiver?.friend_code || '......';
                      const level = req.receiver?.level || 1;

                      return (
                        <div key={req.id} className="glass-card p-4 flex flex-col justify-between space-y-4 hover:border-slate-700/50 transition">
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-base shadow-md shrink-0">
                              {displayName[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-slate-100 truncate">{displayName}</h4>
                              <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5 mb-1.5">
                                {friendCode}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full">
                                  Level {level}
                                </span>
                                <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full animate-pulse">
                                  Pending Approval
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                            <span>Sent {format(parseISO(req.created_at), 'MMM d, yyyy')}</span>
                          </div>

                          <div className="flex items-center pt-1">
                            <Button
                              variant="secondary"
                              onClick={() => handleCancelRequest(req.id)}
                              disabled={actionUserId === req.id}
                              className="w-full py-2 text-xs font-semibold"
                            >
                              Cancel Request
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: DISCOVER & SEARCH */}
      {activeTab === 'discover' && (
        <div className="space-y-4">
          {!debouncedQuery ? (
            <EmptyState
              icon={Search}
              title="Search for Friends"
              description="Enter a display name or an exact 7-character Friend Code in the search box above."
            />
          ) : isSearching ? (
            <div className="py-12"><LoadingState message="Searching users..." /></div>
          ) : searchResults.length === 0 ? (
            <EmptyState
              icon={UserX}
              title="No users found"
              description="Double-check the Friend Code spelling or display name."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((userItem) => {
                const isAlreadyFriend = friends.some((f) => f.friend_id === userItem.id);
                const isRequestSent = outgoingRequests.some((r) => r.receiver_id === userItem.id);
                const name = userItem.display_name || 'User';

                return (
                  <div key={userItem.id} className="glass-card p-4 flex flex-col justify-between space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-base shrink-0 shadow-md">
                        {name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-100 truncate">{name}</h4>
                        <p className="text-[11px] font-mono text-purple-400">Code: {userItem.friend_code || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-semibold">Level {userItem.level || 1}</span>

                      {isAlreadyFriend ? (
                        <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center gap-1">
                          <UserCheck size={14} /> Friend
                        </span>
                      ) : isRequestSent ? (
                        <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center gap-1">
                          <Clock size={14} /> Sent
                        </span>
                      ) : (
                        <Button
                          variant="neon"
                          onClick={() => handleSendRequest(userItem.id)}
                          disabled={actionUserId === userItem.id}
                          className="px-3.5 py-1.5 text-xs font-semibold"
                          icon={UserPlus}
                        >
                          Send Request
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* FRIEND PROFILE PREVIEW MODAL */}
      <FriendProfileModal
        isOpen={Boolean(selectedFriendIdForPreview)}
        onClose={() => setSelectedFriendIdForPreview(null)}
        friendUserId={selectedFriendIdForPreview}
      />

      {/* REMOVE FRIEND CONFIRMATION MODAL */}
      <RemoveFriendModal
        isOpen={Boolean(selectedFriendForRemoval)}
        onClose={() => setSelectedFriendForRemoval(null)}
        onConfirm={handleConfirmRemoveFriend}
        friendName={selectedFriendForRemoval?.name || 'Friend'}
        loading={isRemoving}
      />
    </div>
  );
}
