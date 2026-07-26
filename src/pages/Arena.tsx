import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useArena } from '../hooks/useArena';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useActivityFeed } from '../hooks/useActivityFeed';
import { hallOfFameService } from '../services/hallOfFameService';
import { HallOfFameEntry } from '../types/hallOfFame';
import { PeriodType, Arena } from '../types/arena';
import ArenaHeader from '../components/arena/ArenaHeader';
import PeriodToggleCountdown from '../components/arena/PeriodToggleCountdown';
import TopThreePodium from '../components/arena/TopThreePodium';
import LeaderboardTable from '../components/arena/LeaderboardTable';
import YourPositionCard from '../components/arena/YourPositionCard';
import WeeklyProgressCard from '../components/arena/WeeklyProgressCard';
import WeeklyChampionCard from '../components/arena/WeeklyChampionCard';
import FriendActivityPreview from '../components/arena/FriendActivityPreview';
import HallOfFamePreview from '../components/arena/HallOfFamePreview';
import PersonalBestModal from '../components/arena/PersonalBestModal';
import RankUpModal from '../components/arena/RankUpModal';
import ChampionModal from '../components/arena/ChampionModal';
import { celebrationManager } from '../lib/arena/celebrationManager';
import { celebrationQueue, CelebrationItem } from '../lib/arena/celebrationQueue';
import { calculateWinningStreak } from '../lib/arena/championEngine';
import { LoadingState } from '../components/ui/Loading';
import { format, startOfWeek, startOfMonth } from 'date-fns';

export default function ArenaPage() {
  const { user, profile, preferences } = useStore();
  const { defaultArena, userArenas, loading: loadingArena } = useArena();
  const [selectedArena, setSelectedArena] = useState<Arena | null>(null);

  // Period Toggle State ('weekly' | 'monthly')
  const [periodType, setPeriodType] = useState<PeriodType>('weekly');

  // Active Celebration Item from Queue
  const [activeCelebration, setActiveCelebration] = useState<CelebrationItem | null>(null);

  // Subscribe to celebration queue updates
  useEffect(() => {
    const unsubscribe = celebrationQueue.subscribe((item) => {
      setActiveCelebration(item);
    });
    return () => unsubscribe();
  }, []);

  // Compute Period Start string (yyyy-MM-dd)
  const periodStart = useMemo(() => {
    const now = new Date();
    if (periodType === 'weekly') {
      const monday = startOfWeek(now, { weekStartsOn: 1 });
      return format(monday, 'yyyy-MM-dd');
    } else {
      const firstOfMonth = startOfMonth(now);
      return format(firstOfMonth, 'yyyy-MM-dd');
    }
  }, [periodType]);

  // Sync selected arena
  useEffect(() => {
    if (defaultArena && !selectedArena) {
      setSelectedArena(defaultArena);
    }
  }, [defaultArena, selectedArena]);

  const activeArenaId = selectedArena?.id || defaultArena?.id;

  // Hooks for Leaderboard & Activity
  const { leaderboard, userScore, loading: loadingLeaderboard, refresh: refreshLeaderboard } = useLeaderboard(activeArenaId, periodType, periodStart);
  const { activities, loading: loadingActivities } = useActivityFeed(10);

  // Hall of Fame Entries State
  const [hallOfFameEntries, setHallOfFameEntries] = useState<HallOfFameEntry[]>([]);
  const [loadingHallOfFame, setLoadingHallOfFame] = useState<boolean>(true);

  // Fetch Hall of Fame Entries
  useEffect(() => {
    if (!activeArenaId) return;
    setLoadingHallOfFame(true);
    hallOfFameService.getHallOfFameEntries(activeArenaId, periodType, 10)
      .then((data) => setHallOfFameEntries(data))
      .catch((err) => console.error('Failed to load Hall of Fame:', err))
      .finally(() => setLoadingHallOfFame(false));
  }, [activeArenaId, periodType]);

  // Enqueue Celebrations Safely via Queue Manager
  useEffect(() => {
    if (!userScore || loadingLeaderboard) return;

    const currentRank = userScore.rank || (leaderboard.findIndex((i) => i.user_id === user?.id) + 1) || 1;
    const previousRank = (userScore as any).previousRank || null;
    const historicalScores = leaderboard.filter(i => i.user_id === user?.id).map(i => i.arena_score);

    const celebrations = celebrationManager.checkCelebrations(
      userScore,
      historicalScores,
      previousRank,
      currentRank
    );

    // 1. Enqueue Champion Celebration (Highest Priority)
    if (celebrations.isChampion && preferences.notify_arena_champion) {
      celebrationQueue.enqueue('champion', {
        username: profile.display_name || 'Champion',
        score: userScore.arena_score,
        winningStreak: 1,
      });
      celebrationManager.markChampionCelebrated();
    }

    // 2. Enqueue Personal Best Celebration
    if (celebrations.personalBest && preferences.notify_arena_personal_best) {
      celebrationQueue.enqueue('personal_best', {
        previousBest: celebrations.personalBest.previousBest,
        currentScore: celebrations.personalBest.currentScore,
        improvement: celebrations.personalBest.improvement,
      });
    }

    // 3. Enqueue Rank Up Celebration
    if (celebrations.rankUp && celebrations.rankUp.movement === 'up' && preferences.notify_arena_rank_up) {
      celebrationQueue.enqueue('rank_up', {
        previousRank: previousRank || currentRank + celebrations.rankUp.delta,
        currentRank,
        positionsClimbed: celebrations.rankUp.delta,
      });
    }
  }, [userScore, leaderboard, loadingLeaderboard, user?.id, profile.display_name, preferences]);

  // Top Contender for Champion Card
  const topChampionScore = leaderboard.length > 0 ? leaderboard[0] : null;
  const winningStreak = calculateWinningStreak(topChampionScore?.user_id, hallOfFameEntries);

  const handleDismissCelebration = useCallback(() => {
    celebrationQueue.dequeue();
  }, []);

  return (
    <div className="page-enter space-y-6 text-left">
      {/* 1. ARENA HEADER */}
      <ArenaHeader
        currentArena={selectedArena}
        arenas={userArenas.length > 0 ? userArenas : (defaultArena ? [defaultArena] : [])}
        onSelectArena={(arena) => setSelectedArena(arena)}
      />

      {/* 2. WEEKLY / MONTHLY TOGGLE & COUNTDOWN */}
      <PeriodToggleCountdown
        periodType={periodType}
        onChangePeriod={(p) => setPeriodType(p)}
      />

      {loadingLeaderboard || loadingArena ? (
        <div className="py-16 flex justify-center">
          <LoadingState message="Loading Productivity Arena Leaderboard..." />
        </div>
      ) : (
        <>
          {/* 3. TOP 3 PODIUM */}
          <TopThreePodium
            leaderboard={leaderboard}
            currentUserId={user?.id}
          />

          {/* 4. LEADERBOARD TABLE */}
          <LeaderboardTable
            leaderboard={leaderboard}
            currentUserId={user?.id}
          />

          {/* 5. YOUR POSITION CARD */}
          <YourPositionCard
            userScore={userScore}
            leaderboard={leaderboard}
          />

          {/* 6. WEEKLY PROGRESS */}
          <WeeklyProgressCard
            userScore={userScore}
            streak={profile.streak || 0}
          />

          {/* 7. WEEKLY CHAMPION */}
          <WeeklyChampionCard
            championScore={topChampionScore}
            currentUserId={user?.id}
          />

          {/* 8. FRIEND ACTIVITY PREVIEW */}
          <FriendActivityPreview
            activities={activities}
            loading={loadingActivities}
          />

          {/* 9. HALL OF FAME PREVIEW */}
          <HallOfFamePreview
            entries={hallOfFameEntries}
            loading={loadingHallOfFame}
          />
        </>
      )}

      {/* SEQUENTIAL CELEBRATION QUEUE MODALS */}
      {activeCelebration?.type === 'champion' && (
        <ChampionModal
          isOpen={true}
          onClose={handleDismissCelebration}
          username={activeCelebration.payload.username}
          score={activeCelebration.payload.score}
          winningStreak={winningStreak}
        />
      )}

      {activeCelebration?.type === 'personal_best' && (
        <PersonalBestModal
          isOpen={true}
          onClose={handleDismissCelebration}
          previousBest={activeCelebration.payload.previousBest}
          currentScore={activeCelebration.payload.currentScore}
          improvement={activeCelebration.payload.improvement}
        />
      )}

      {activeCelebration?.type === 'rank_up' && (
        <RankUpModal
          isOpen={true}
          onClose={handleDismissCelebration}
          previousRank={activeCelebration.payload.previousRank}
          currentRank={activeCelebration.payload.currentRank}
          positionsClimbed={activeCelebration.payload.positionsClimbed}
        />
      )}
    </div>
  );
}
