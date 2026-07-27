import { lessonsApi } from "../api/lessons-api";
import type {
  CourseOption,
  LessonDetails,
  LessonFormValues,
  LessonListItem,
} from "../types/lesson";

export const lessonsService = {
  async getLessons(): Promise<LessonListItem[]> {
    const lessons = await lessonsApi.getAll();
    return Array.isArray(lessons) ? lessons : [];
  },
  getLesson(lessonId: string): Promise<LessonDetails> {
    return lessonsApi.getById(lessonId);
  },
  getCourses(): Promise<CourseOption[]> {
    return lessonsApi.getCourses();
  },
  createLesson(values: LessonFormValues): Promise<unknown> {
    return lessonsApi.create(values);
  },
  updateLesson(lessonId: string, values: LessonFormValues): Promise<unknown> {
    return lessonsApi.update(lessonId, values);
  },
  deleteLesson(lessonId: string): Promise<unknown> {
    return lessonsApi.delete(lessonId);
  },
};
