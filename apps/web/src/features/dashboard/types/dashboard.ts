export interface DashboardUser {
  userId: string;
  email: string;
  username: string;
  role: string;
  experience: number;
  coins: number;
  level: number;
  streak: number;
  nameEffectId?: string | null;
  completions?: number;
  certificates?: number;
  enrollments?: number;
}

export interface ReferralOverview {
  profile?: { referralCode?: string };
  stats: { validated: number };
  referrals: unknown[];
  nextReward?: { threshold?: number | null; name: string } | null;
  leaderboard?: { currentRank?: { currentRank?: number | null } | null };
}

export interface ContinueLearningCourse {
  courseId: string;
  title: string | null;
  imageUrl: string | null;
  totalExercises: number;
  completedExercises: number;
  progressPercent: number;
  lastActivityAt: string;
  // Siguiente paso: si nextExercise es null, toca leer la lección nextLessonId.
  nextLessonId?: string | null;
  nextExercise: { id: string; type: string; lessonId: string } | null;
}

export interface TopPlayerEntry {
  rank: number;
  userId: string;
  username: string;
  value: number;
}

export interface DailyMission {
  id: string;
  name: string;
  description: string;
  cadence: string;
  progress: {
    currentValue: number;
    targetValue: number;
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CLAIMED";
  };
}
