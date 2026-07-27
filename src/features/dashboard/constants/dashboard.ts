import type { DashboardCourse, TopPlayer } from "../types/dashboard";

export const DASHBOARD_COURSES: DashboardCourse[] = [
  { titleKey: "dashboard.sampleCourse1Title", categoryKey: "dashboard.categoryFrontend", progress: 72, lessons: 28, image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop" },
  { titleKey: "dashboard.sampleCourse2Title", categoryKey: "dashboard.categoryBackend", progress: 41, lessons: 18, image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1200&auto=format&fit=crop" },
  { titleKey: "dashboard.sampleCourse3Title", categoryKey: "dashboard.categoryDatabase", progress: 89, lessons: 35, image: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=1200&auto=format&fit=crop" },
];

export const TOP_PLAYERS: TopPlayer[] = [
  { name: "NeoCoder", xp: "15,200 XP" }, { name: "ByteHunter", xp: "14,900 XP" }, { name: "NullMaster", xp: "14,320 XP" },
];
