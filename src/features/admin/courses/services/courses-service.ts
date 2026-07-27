import { coursesApi } from "../api/courses-api";
import type {
  CourseDetails,
  CourseFormValues,
  CourseListItem,
  ModuleOption,
} from "../types/course";

export const coursesService = {
  async getCourses(): Promise<CourseListItem[]> {
    const courses = await coursesApi.getAll();
    return Array.isArray(courses) ? courses : [];
  },
  getCourse(courseId: string): Promise<CourseDetails> {
    return coursesApi.getById(courseId);
  },
  getModules(): Promise<ModuleOption[]> {
    return coursesApi.getModules();
  },
  async uploadImage(file: File | null, fallback: string | null): Promise<string | null> {
    if (!file) return fallback;
    return (await coursesApi.uploadImage(file)).url;
  },
  createCourse(values: CourseFormValues, imageUrl: string | null): Promise<unknown> {
    return coursesApi.create(values, imageUrl);
  },
  updateCourse(
    courseId: string,
    values: CourseFormValues,
    imageUrl: string | null,
  ): Promise<unknown> {
    return coursesApi.update(courseId, values, imageUrl);
  },
  deleteCourse(courseId: string): Promise<unknown> {
    return coursesApi.delete(courseId);
  },
};
