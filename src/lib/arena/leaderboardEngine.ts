import { ArenaScore } from '../../types/arena';

export type RankMovement = 'up' | 'down' | 'same';

export interface ArenaScoreWithMovement extends ArenaScore {
  rank: number;
  previousRank?: number | null;
  rankMovement: RankMovement;
  movementDelta: number;
}

/**
 * Sorts arena scores with tie-breaking rules:
 * 1. Higher arena_score
 * 2. Higher focus_minutes
 * 3. Higher tasks_completed
 * 4. Earlier created_at / updated_at
 */
export function sortArenaScores(scores: ArenaScore[]): ArenaScore[] {
  if (!scores || !Array.isArray(scores)) return [];

  return [...scores].sort((a, b) => {
    const scoreA = a.arena_score || 0;
    const scoreB = b.arena_score || 0;
    if (scoreA !== scoreB) return scoreB - scoreA;

    const focusA = a.focus_minutes || 0;
    const focusB = b.focus_minutes || 0;
    if (focusA !== focusB) return focusB - focusA;

    const tasksA = a.tasks_completed || 0;
    const tasksB = b.tasks_completed || 0;
    if (tasksA !== tasksB) return tasksB - tasksA;

    const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
    const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
    return dateA - dateB;
  });
}

/**
 * Builds sorted leaderboard with rank assignment and rank movement comparison
 */
export function buildLeaderboard(
  scores: ArenaScore[],
  previousRanksMap?: Map<string, number>
): ArenaScoreWithMovement[] {
  const sorted = sortArenaScores(scores);

  let currentRank = 1;

  return sorted.map((item, index) => {
    // Handle ties correctly: if score equal to previous item, share same rank
    if (index > 0) {
      const prev = sorted[index - 1];
      if (
        (item.arena_score || 0) === (prev.arena_score || 0) &&
        (item.focus_minutes || 0) === (prev.focus_minutes || 0) &&
        (item.tasks_completed || 0) === (prev.tasks_completed || 0)
      ) {
        // Keep currentRank same as previous item
      } else {
        currentRank = index + 1;
      }
    } else {
      currentRank = 1;
    }

    const prevRank = previousRanksMap ? previousRanksMap.get(item.user_id) : item.rank || null;

    let movement: RankMovement = 'same';
    let delta = 0;

    if (prevRank != null && typeof prevRank === 'number') {
      if (currentRank < prevRank) {
        movement = 'up';
        delta = prevRank - currentRank;
      } else if (currentRank > prevRank) {
        movement = 'down';
        delta = currentRank - prevRank;
      } else {
        movement = 'same';
        delta = 0;
      }
    }

    return {
      ...item,
      rank: currentRank,
      previousRank: prevRank,
      rankMovement: movement,
      movementDelta: delta,
    };
  });
}
