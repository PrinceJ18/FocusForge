import React, { useMemo, useState, useEffect } from 'react';
import { Trophy, Star, Zap, Flame, Target, Award, Lock, CheckCircle2, TrendingUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../lib/formatCurrency';
import { supabase } from '../lib/supabase';
import {
  ALL_BADGES,
  getEarnedBadgeIds,
} from '../lib/statsUtils';
import {
  calculateCurrentLevel,
  calculateXPProgress,
  calculateCompletedTasks,
  calculateAchievements,
  calculateTodaySessions,
  calculateTodayFocus,
  calculateTodayTasks,
  isDateToday,
} from '../lib/statistics';


const LEVELS = [
  { level: 1, title: 'Starter', minXP: 0, color: '#94a3b8' },
  { level: 2, title: 'Beginner', minXP: 100, color: '#10b981' },
  { level: 3, title: 'Focused', minXP: 200, color: '#06b6d4' },
  { level: 4, title: 'Achiever', minXP: 300, color: '#8b5cf6' },
  { level: 5, title: 'Expert', minXP: 400, color: '#f59e0b' },
  { level: 6, title: 'Master', minXP: 500, color: '#ef4444' },
  { level: 7, title: 'Legend', minXP: 600, color: '#ec4899' },
];

const DAILY_CHALLENGES = [
  { id: 'c1', text: 'Complete 2 focus sessions', reward: 20, icon: '⏱', color: '#a855f7' },
  { id: 'c2', text: 'Add 3 expenses', reward: 10, icon: '💸', color: '#ec4899' },
  { id: 'c3', text: 'Complete 5 tasks', reward: 25, icon: '✅', color: '#10b981' },
  { id: 'c4', text: 'Focus for 60+ minutes', reward: 30, icon: '🧠', color: '#06b6d4' },
];

export default function Rewards() {
  const {
    profile,
    focusSessions,
    tasks,
    savingsGoals,
    expenses,
    addXP,
    user,
  } = useStore();
  const currentLevel = calculateCurrentLevel(profile.xp);

  const levelProgress = calculateXPProgress(profile.xp);
  const xpToNext = currentLevel.xpToNext;
  const today = new Date().toISOString().split('T')[0];

  const [claimedChallenges, setClaimedChallenges] = useState<string[]>([]);
  useEffect(() => {
    const today = new Date()
      .toISOString()
      .split('T')[0];

    const savedClaims =
      profile?.daily_challenge_claims;

    console.log('PROFILE CLAIMS', savedClaims);

    if (
      savedClaims?.date === today
    ) {
      console.log(
        'SETTING CLAIMED',
        savedClaims.claimed
      );

      setClaimedChallenges(
        savedClaims.claimed || []
      );
    }
  }, [profile]);


  const completedTasks = calculateCompletedTasks(tasks);

  const earnedBadges = useMemo(
    () => getEarnedBadgeIds({ profile, focusSessions, tasks, savingsGoals }),
    [profile, focusSessions, tasks, savingsGoals]
  );


  const achievements = useMemo(
    () => calculateAchievements(focusSessions, tasks, savingsGoals, expenses, profile),
    [focusSessions, tasks, savingsGoals, expenses, profile]
  );
  const claimChallenge = async (
    challengeId: string,
    reward: number
  ) => {
    if (claimedChallenges.includes(challengeId)) return;

    const challengeInfo = DAILY_CHALLENGES.find((c) => c.id === challengeId);

    await addXP(reward);

    // Trigger global notification
    useStore.getState().showNotification({
      type: 'challenge',
      title: 'Daily Challenge Complete',
      message: challengeInfo?.text || 'Challenge completed!',
      xp: reward,
    });

    const updatedClaims = [
      ...claimedChallenges,
      challengeId,
    ];

    setClaimedChallenges(updatedClaims);

    if (user) {
      await supabase
        .from('profiles')
        .update({
          daily_challenge_claims: {
            date: today,
            claimed: updatedClaims,
          },
        })
        .eq('id', user.id);
    }
  };

  return (
    <div className="page-enter space-y-6">
      {/* Premium Level Card */}
      <div
        className="glass-card p-6 sm:p-8 relative overflow-hidden group"
        style={{
          background: `linear-gradient(135deg, ${currentLevel.color}18, rgba(15,15,20,0.95))`,
          border: `1px solid ${currentLevel.color}30`,
          boxShadow: `0 0 40px ${currentLevel.color}15`,
        }}
      >
        {/* Animated glow orbs */}
        <div
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-all duration-700"
          style={{
            background: `radial-gradient(circle, ${currentLevel.color}, transparent 70%)`,
          }}
        />

        <div
          className="absolute bottom-0 left-0 w-full h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${currentLevel.color}, transparent)`,
          }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-6">

          {/* Trophy Icon */}
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl flex-shrink-0 transition-all duration-500 group-hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${currentLevel.color}30, rgba(255,255,255,0.05))`,
              border: `1px solid ${currentLevel.color}40`,
              boxShadow: `0 0 30px ${currentLevel.color}25`,
              backdropFilter: 'blur(12px)',
            }}
          >
            🏆
          </div>

          {/* Main Content */}
          <div className="flex-1 w-full">

            {/* Top badge */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div
                className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase"
                style={{
                  background: `${currentLevel.color}20`,
                  color: currentLevel.color,
                  border: `1px solid ${currentLevel.color}35`,
                }}
              >
                Elite Progression
              </div>

              <div
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-secondary)',
                }}
              >
                🔥 {profile.streak || 0} Day Streak
              </div>
            </div>

            {/* Heading */}
            <h2
              className="text-3xl sm:text-4xl font-black mb-2 tracking-tight"
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'Space Grotesk',
              }}
            >
              Level {currentLevel.level}
            </h2>

            <p
              className="text-lg font-semibold mb-2"
              style={{ color: currentLevel.color }}
            >
              {currentLevel.title}
            </p>

            <p
              className="text-sm sm:text-base mb-5"
              style={{ color: 'var(--text-secondary)' }}
            >
              {profile.xp || 0} XP earned • {xpToNext} XP remaining to unlock{" "}
              <span style={{ color: currentLevel.color, fontWeight: 700 }}>
                Level {currentLevel.level + 1}
              </span>
            </p>

            {/* Progress */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-2">
                <span
                  className="text-xs uppercase tracking-widest"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Level Progress
                </span>

                <span
                  className="text-sm font-bold"
                  style={{ color: currentLevel.color }}
                >
                  {Math.round(levelProgress)}%
                </span>
              </div>

              <div
                className="relative overflow-hidden rounded-full"
                style={{
                  height: 12,
                  background: 'rgba(255,255,255,0.06)',
                }}
              >
                {/* Fill */}
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(levelProgress, 100)}%`,
                    background: `linear-gradient(90deg, ${currentLevel.color}, ${currentLevel.color})`,
                    boxShadow: `0 0 18px ${currentLevel.color}80`,
                  }}
                />

                {/* Shine effect */}
                <div
                  className="absolute top-0 h-full w-24 opacity-30"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                    animation: 'pulse 2.5s infinite',
                  }}
                />
              </div>
            </div>

            {/* Bottom stats */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div
                className="rounded-2xl p-3 text-center"
                style={{ background: 'rgba(168,85,247,0.08)' }}
              >
                <div
                  className="text-xl font-black"
                  style={{ color: '#a855f7' }}
                >
                  {profile.xp || 0}
                </div>
                <div
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Total XP
                </div>
              </div>

              <div
                className="rounded-2xl p-3 text-center"
                style={{ background: 'rgba(245,158,11,0.08)' }}
              >
                <div
                  className="text-xl font-black"
                  style={{ color: '#f59e0b' }}
                >
                  {profile.streak || 0}
                </div>
                <div
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Streak
                </div>
              </div>

              <div
                className="rounded-2xl p-3 text-center"
                style={{ background: 'rgba(16,185,129,0.08)' }}
              >
                <div
                  className="text-xl font-black"
                  style={{ color: '#10b981' }}
                >
                  {earnedBadges.size}
                </div>
                <div
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Badges
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <RewardStat icon={<Zap size={20} />} label="Total XP" value={String(profile.xp)} color="#a855f7" />
        <RewardStat icon={<Flame size={20} />} label="Streak" value={`${profile.streak || 0} days`} color="#f59e0b" />
        <RewardStat icon={<CheckCircle2 size={20} />} label="Tasks Done" value={String(completedTasks)} color="#10b981" />
        <RewardStat icon={<Star size={20} />} label="Badges" value={`${earnedBadges.size}/${ALL_BADGES.length}`} color="#06b6d4" />
      </div>

      {/* Daily Challenges */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Target size={18} style={{ color: '#a855f7' }} />
          Daily Challenges
          <span className="text-xs px-2 py-0.5 rounded-full ml-1" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>Resets daily</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {DAILY_CHALLENGES.map((challenge) => {
            const isDone = checkChallengeCompletion(
              challenge.id,
              {
                focusSessions,
                tasks,
                expenses,
              }
            );


            return (
              <div
                key={challenge.id}
                className="flex items-center gap-4 p-4 rounded-14"
                style={{
                  background: isDone ? `${challenge.color}10` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isDone ? challenge.color + '30' : 'var(--border-color)'}`,
                  borderRadius: 12,
                  opacity: isDone ? 1 : 0.8,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: `${challenge.color}15` }}
                >
                  {challenge.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: isDone ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {challenge.text}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: challenge.color }}>+{challenge.reward} XP</p>
                </div>
                <div className="flex-shrink-0">
                  {!isDone ? (
                    <div
                      className="text-xs px-3 py-1 rounded-full"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      In Progress
                    </div>
                  ) : claimedChallenges.includes(challenge.id) ? (
                    <div
                      className="text-xs px-3 py-1 rounded-full"
                      style={{
                        background: 'rgba(16,185,129,0.15)',
                        color: '#10b981',
                      }}
                    >
                      Claimed
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        claimChallenge(
                          challenge.id,
                          challenge.reward
                        )
                      }
                      className="btn-neon px-3 py-1 text-xs"
                    >
                      Claim
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Award size={18} style={{ color: '#a855f7' }} />
          Achievement Badges
          <span className="text-sm ml-2" style={{ color: 'var(--text-muted)' }}>
            ({earnedBadges.size}/{ALL_BADGES.length} earned)
          </span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {ALL_BADGES.map((badge) => {
            const earned = earnedBadges.has(badge.id);
            return (
              <div
                key={badge.id}
                className={`badge-card ${earned ? 'earned' : ''}`}
                style={earned ? { borderColor: badge.color + '50', background: badge.color + '10' } : {}}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3"
                  style={{
                    background: earned ? `${badge.color}20` : 'rgba(255,255,255,0.05)',
                    filter: earned ? 'none' : 'grayscale(100%) opacity(0.4)',
                  }}
                >
                  {badge.icon}
                </div>
                <p
                  className="text-sm font-semibold mb-1"
                  style={{ color: earned ? badge.color : 'var(--text-muted)', fontFamily: 'Space Grotesk' }}
                >
                  {badge.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {badge.desc}
                </p>
                {!earned && (
                  <Lock size={12} className="mx-auto mt-2" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Level progression */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <TrendingUp size={18} style={{ color: '#a855f7' }} />
          Level Progression
        </h3>
        <div className="space-y-3">
          {LEVELS.map((level) => {
            const isUnlocked = profile.xp >= level.minXP;
            const isCurrent = level.level === currentLevel.level;
            return (
              <div
                key={level.level}
                className="flex items-center gap-4 p-3 rounded-12"
                style={{
                  background: isCurrent ? `${level.color}15` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isCurrent ? level.color + '40' : 'transparent'}`,
                  borderRadius: 12,
                  opacity: isUnlocked ? 1 : 0.5,
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
                  style={{
                    background: isUnlocked ? `${level.color}20` : 'rgba(255,255,255,0.05)',
                    color: isUnlocked ? level.color : 'var(--text-muted)',
                  }}
                >
                  {level.level}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: isUnlocked ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {level.title}
                    {isCurrent && <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: `${level.color}25`, color: level.color }}>Current</span>}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{level.minXP} XP required</p>
                </div>
                {isUnlocked ? (
                  <CheckCircle2 size={18} style={{ color: level.color }} />
                ) : (
                  <Lock size={16} style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RewardStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="stat-card">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}20`, color }}>
        {icon}
      </div>
      <div className="text-xl font-bold mb-0.5" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

function checkChallengeCompletion(
  id: string,
  {
    focusSessions,
    tasks,
    expenses,
  }: {
    focusSessions: any[];
    tasks: any[];
    expenses: any[];
  }
): boolean {
  if (id === 'c1') {
    return calculateTodaySessions(focusSessions) >= 2;
  }

  if (id === 'c2') {
    const todayExpenses = expenses.filter(
      (e) => isDateToday(e.expense_date) || (e.created_at && isDateToday(e.created_at))
    ).length;
    return todayExpenses >= 3;
  }

  if (id === 'c3') {
    return calculateTodayTasks(tasks) >= 5;
  }

  if (id === 'c4') {
    return calculateTodayFocus(focusSessions) >= 60;
  }

  return false;
}