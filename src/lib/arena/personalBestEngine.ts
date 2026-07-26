export interface PersonalBestResult {
  isPersonalBest: boolean;
  currentScore: number;
  previousBest: number;
  improvement: number;
}

/**
 * Detects if current Arena Score is a new Personal Best compared to historical scores
 */
export function detectPersonalBest(
  currentScore: number,
  historicalScores: number[]
): PersonalBestResult {
  const safeScore = Math.max(0, currentScore || 0);

  if (!historicalScores || historicalScores.length === 0) {
    return {
      isPersonalBest: safeScore > 0,
      currentScore: safeScore,
      previousBest: 0,
      improvement: safeScore,
    };
  }

  const previousBest = Math.max(0, ...historicalScores);
  const isPersonalBest = safeScore > previousBest;
  const improvement = Math.max(0, safeScore - previousBest);

  return {
    isPersonalBest,
    currentScore: safeScore,
    previousBest,
    improvement,
  };
}
