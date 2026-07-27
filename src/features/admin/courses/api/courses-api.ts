import { api } from "@/shared/api";

import type {
  CourseDetails,
  CourseFormValues,
  CourseListItem,
  ModuleOption,
} from "../types/course";

export const coursesApi = {
  getAll: () => api.get<CourseListItem[]>("/courses?lang=es"),
  getById: (courseId: string) => api.get<CourseDetails>(`/courses/admin/${courseId}`),
  getModules: () => api.get<ModuleOption[]>("/modules"),
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
