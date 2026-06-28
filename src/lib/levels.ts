export interface LevelInfo {
  level: number;
  title: string;
  color: string;
  progress: number;
  xpToNext: number;
}

export function getLevelInfo(xp: number): LevelInfo {
  const level = Math.floor(xp / 100) + 1;
  const progress = xp % 100;
  const xpToNext = 100 - progress;

  const titles = [
    "Starter",
    "Beginner",
    "Focused",
    "Achiever",
    "Expert",
    "Master",
    "Legend",
  ];

  const colors = [
    "#94a3b8", // Starter
    "#10b981", // Beginner
    "#06b6d4", // Focused
    "#8b5cf6", // Achiever
    "#f59e0b", // Expert
    "#ef4444", // Master
    "#ec4899", // Legend
  ];

  return {
    level,
    title: titles[Math.min(level - 1, titles.length - 1)],
    color: colors[Math.min(level - 1, colors.length - 1)],
    progress,
    xpToNext,
  };
}