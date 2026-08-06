import { api } from "@/shared/api";

import type {
  CourseDetails,
  CourseFormValues,
  CourseListItem,
  ModuleOption,
} from "../types/course";

interface CourseLessonSummary {
  id: string;
  order: number;
  title: string | null;
}

export const coursesApi = {
  getAll: () => api.get<CourseListItem[]>("/courses?lang=es"),
  getById: (courseId: string) => api.get<CourseDetails>(`/courses/admin/${courseId}`),
  getLessons: (courseId: string) =>
    api.get<CourseLessonSummary[]>(`/lessons/course/${courseId}?lang=es`),
  reorderLessons: (items: Array<{ id: string; order: number }>) =>
    api.patch("/lessons/reorder", { items }),
  getModules: () => api.get<ModuleOption[]>("/modules"),
  getCategories: () => api.get<Array<{ id: string; slug: string; name: string }>>("/course-categories"),
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "courses");
    return api.post<{ url: string }>("/uploads", formData);
  },
  create: (values: CourseFormValues, imageUrl: string | null) =>
    api.post("/courses", { ...values, imageUrl }),
  update: (courseId: string, values: CourseFormValues, imageUrl: string | null) =>
    api.patch(`/courses/${courseId}`, { ...values, imageUrl }),
  delete: (courseId: string) => api.delete(`/courses/${courseId}`),
};
