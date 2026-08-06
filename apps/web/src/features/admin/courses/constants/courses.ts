import type { CourseFormValues } from "../types/course";

export const COURSES_ROUTE = "/admin/courses";
export const COURSE_REDIRECT_DELAY_MS = 1200;

export const INITIAL_COURSE_VALUES: CourseFormValues = {
  moduleId: "",
  difficulty: "EASY",
  freeLimit: 5,
  status: "PUBLISHED",
  translations: [{ languageCode: "es", title: "", description: "" }],
  prerequisiteCourseIds: [],
  categoryIds: [],
};
