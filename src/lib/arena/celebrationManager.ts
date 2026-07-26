import { detectPersonalBest, PersonalBestResult } from './personalBestEngine';
import { calculateRankImprovement, RankImprovementResult } from './rankEngine';
import { ArenaScore } from '../../types/arena';

export interface CelebrationCheckResult {
  personalBest: PersonalBestResult | null;
  rankUp: RankImprovementResult | null;
  isChampion: boolean;
}

const CHAMPION_SESSION_KEY = 'focusforge_arena_champion_celebrated';

export const celebrationManager = {
  /**
   * Checks for personal bests, rank improvements, and champion status
   */
  checkCelebrations(
    userScore: ArenaScore | null,
    historicalScores: number[],
    previousRank: number | null,
    currentRank: number
  ): CelebrationCheckResult {
    let personalBest: PersonalBestResult | null = null;
    let rankUp: RankImprovementResult | null = null;
    let isChampion = false;

    if (!userScore) {
      return { personalBest, rankUp, isChampion };
    }

    // 1. Check Personal Best
    const pbResult = detectPersonalBest(userScore.arena_score, historicalScores);
    if (pbResult.isPersonalBest && pbResult.improvement > 0) {
      personalBest = pbResult;
    }

    // 2. Check Rank Up
    if (previousRank != null && currentRank < previousRank) {
      rankUp = calculateRankImprovement(previousRank, currentRank);
    }

    // 3. Check Champion (#1 rank)
    if (currentRank === 1 && userScore.arena_score > 0) {
      const alreadyCelebrated = typeof window !== 'undefined' && sessionStorage.getItem(CHAMPION_SESSION_KEY) === 'true';
      if (!alreadyCelebrated) {
        isChampion = true;
      }
    }

    return {
      personalBest,
      rankUp,
      isChampion,
    };
  },

  /**
   * Marks champion celebration as completed for current browser session
   */
  markChampionCelebrated(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(CHAMPION_SESSION_KEY, 'true');
    }
  },
};
