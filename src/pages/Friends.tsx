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
        showNotification({ type: 'error', title: 'Search Error', message: 'Failed to search users' });
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
          <button
            onClick={handleCopyCode}
            className="px-3 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-semibold text-xs transition flex items-center gap-1.5 border border-purple-500/40 active:scale-95 touch-target"
            title="Copy Friend Code"
          >
            {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
          </button>
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
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none focus:border-purple-500 transition"
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
            <div className="glass-card p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto text-xl font-bold">
                <Users size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-200">
                {searchQuery ? 'No matching friends found' : 'No friends yet'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery ? 'Try adjusting your search filter.' : 'Search for friends using their username or unique 6-character Friend Code in the Discover tab.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setActiveTab('discover')}
                  className="btn-neon px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 mt-2"
                >
                  <UserPlus size={14} /> Find Friends
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFriends.map((f) => {
                const displayName = f.profile?.display_name || 'Friend';
                const level = f.profile?.level || Math.floor(Math.sqrt((f.profile?.xp || 0) / 100)) + 1;
                const xp = f.profile?.xp || 0;
                const friendSince = f.created_at ? format(parseISO(f.created_at), 'MMM d, yyyy') : 'Recently';

                return (
                  <div key={f.id} className="glass-card p-4 flex flex-col justify-between space-y-4 hover:border-purple-500/30 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-base shadow-md shrink-0">
                        {displayName[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-100 truncate">{displayName}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                            Level {level}
                          </span>
                          <span className="text-[11px] text-slate-400 font-semibold">{xp} XP</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                      <span>Friend since {friendSince}</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active This Week
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setSelectedFriendIdForPreview(f.friend_id)}
                        className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700/60"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => setSelectedFriendForRemoval({ id: f.friend_id, name: displayName })}
                        className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-xs transition border border-red-500/20"
                        title="Remove Friend"
                      >
                        Remove
                      </button>
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
                    No incoming friend requests.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {incomingRequests.map((req) => (
                      <div key={req.id} className="glass-card p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm shrink-0">
                            U
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-200 truncate">Friend Request</h4>
                            <p className="text-[10px] text-slate-400">Received {format(parseISO(req.created_at), 'MMM d')}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleRespondRequest(req.id, 'accepted')}
                            disabled={actionUserId === req.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespondRequest(req.id, 'rejected')}
                            disabled={actionUserId === req.id}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition border border-slate-700"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* OUTGOING REQUESTS SECTION */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400" /> Sent Pending Requests ({outgoingRequests.length})
                </h3>

                {outgoingRequests.length === 0 ? (
                  <div className="p-6 bg-slate-900/40 rounded-xl border border-slate-800/80 text-center text-xs text-slate-500">
                    No pending sent requests.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {outgoingRequests.map((req) => (
                      <div key={req.id} className="glass-card p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0">
                            U
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-200 truncate">Outgoing Request</h4>
                            <p className="text-[10px] text-amber-400 font-semibold">Pending Approval</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleCancelRequest(req.id)}
                          disabled={actionUserId === req.id}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 font-semibold text-xs transition border border-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
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
            <div className="glass-card p-8 text-center space-y-3">
              <Search size={28} className="mx-auto text-purple-400 opacity-60 mb-2" />
              <h3 className="text-sm font-bold text-slate-200">Search for Friends</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Enter a display name or an exact 6-character Friend Code (e.g. <span className="font-mono text-purple-300 font-bold">AB7KQ2</span>) in the search box above.
              </p>
            </div>
          ) : isSearching ? (
            <div className="py-12"><LoadingState message="Searching users..." /></div>
          ) : searchResults.length === 0 ? (
            <div className="glass-card p-8 text-center text-xs text-slate-400 space-y-2">
              <UserX size={28} className="mx-auto text-slate-500 mb-2" />
              <p className="font-bold text-slate-300">No users found matching "{debouncedQuery}"</p>
              <p className="text-slate-500">Double-check the Friend Code spelling or display name.</p>
            </div>
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
                        <button
                          onClick={() => handleSendRequest(userItem.id)}
                          disabled={actionUserId === userItem.id}
                          className="btn-neon px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                        >
                          <UserPlus size={14} /> Send Request
                        </button>
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
