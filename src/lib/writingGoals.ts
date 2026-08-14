export interface WritingGoals {
  dailyGoal: number;        // words per day
  manuscriptGoal: number;   // total manuscript target
}

export interface DailyProgress {
  date: string;             // YYYY-MM-DD
  wordsWritten: number;     // words written today
  startWordCount: number;   // word count at start of session
}

export interface GoalStreak {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
}

const GOALS_KEY = "prosr-writing-goals";
const PROGRESS_KEY = "prosr-daily-progress";
const STREAK_KEY = "prosr-goal-streak";

export function getGoals(): WritingGoals {
  if (typeof window === "undefined") return { dailyGoal: 1000, manuscriptGoal: 80000 };
  try {
    const stored = localStorage.getItem(GOALS_KEY);
    if (stored) return JSON.parse(stored) as WritingGoals;
  } catch { /* ignore */ }
  return { dailyGoal: 1000, manuscriptGoal: 80000 };
}

export function saveGoals(goals: WritingGoals): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(GOALS_KEY, JSON.stringify(goals)); } catch { /* ignore */ }
}

export function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

export function getDailyProgress(documentId: string): DailyProgress {
  if (typeof window === "undefined") return { date: getTodayKey(), wordsWritten: 0, startWordCount: 0 };
  try {
    const stored = localStorage.getItem(`${PROGRESS_KEY}-${documentId}`);
    if (stored) {
      const progress = JSON.parse(stored) as DailyProgress;
      // Reset if it's a new day
      if (progress.date !== getTodayKey()) {
        return { date: getTodayKey(), wordsWritten: 0, startWordCount: 0 };
      }
      return progress;
    }
  } catch { /* ignore */ }
  return { date: getTodayKey(), wordsWritten: 0, startWordCount: 0 };
}

export function saveDailyProgress(documentId: string, progress: DailyProgress): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${PROGRESS_KEY}-${documentId}`, JSON.stringify(progress));
  } catch { /* ignore */ }
}

export function getStreak(): GoalStreak {
  if (typeof window === "undefined") return { currentStreak: 0, longestStreak: 0, lastCompletedDate: null };
  try {
    const stored = localStorage.getItem(STREAK_KEY);
    if (stored) return JSON.parse(stored) as GoalStreak;
  } catch { /* ignore */ }
  return { currentStreak: 0, longestStreak: 0, lastCompletedDate: null };
}

export function updateStreak(goalMet: boolean): GoalStreak {
  if (typeof window === "undefined") return { currentStreak: 0, longestStreak: 0, lastCompletedDate: null };
  const streak = getStreak();
  const today = getTodayKey();

  if (!goalMet) return streak;
  if (streak.lastCompletedDate === today) return streak; // already counted today

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().split("T")[0];

  const newStreak = streak.lastCompletedDate === yesterdayKey
    ? streak.currentStreak + 1
    : 1;

  const updated: GoalStreak = {
    currentStreak: newStreak,
    longestStreak: Math.max(newStreak, streak.longestStreak),
    lastCompletedDate: today,
  };

  try { localStorage.setItem(STREAK_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  return updated;
}