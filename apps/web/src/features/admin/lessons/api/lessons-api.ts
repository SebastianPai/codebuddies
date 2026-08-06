import { api } from "@/shared/api";

import type {
  CourseOption,
  LessonDetails,
  LessonFormValues,
  LessonListItem,
} from "../types/lesson";
import { toLessonPayload } from "../utils/lesson-mappers";

interface LessonExerciseSummary {
  id: string;
  order: number;
  title: string | null;
}

export const lessonsApi = {
  getAll: () => api.get<LessonListItem[]>("/lessons/admin"),
  getById: (lessonId: string) => api.get<LessonDetails>(`/lessons/admin/${lessonId}`),
  getCourses: () => api.get<CourseOption[]>("/courses"),
  getExercises: (lessonId: string) =>
    api.get<LessonExerciseSummary[]>(`/exercises/lesson/${lessonId}?lang=es`),
  reorderExercises: (items: Array<{ id: string; order: number }>) =>
    api.patch("/exercises/reorder", { items }),
  create: (values: LessonFormValues) =>
    api.post("/lessons", toLessonPayload(values, true)),
  update: (lessonId: string, values: LessonFormValues) =>
    api.patch(`/lessons/${lessonId}`, toLessonPayload(values, false)),
  delete: (lessonId: string) => api.delete(`/lessons/${lessonId}`),
};
