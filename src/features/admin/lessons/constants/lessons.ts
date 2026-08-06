import type { LessonFormValues } from "../types/lesson";

export const LESSONS_ROUTE = "/admin/lessons";
export const LESSON_REDIRECT_DELAY_MS = 1200;

export const INITIAL_CREATE_LESSON_VALUES: LessonFormValues = {
  courseId: "",
  order: 1,
  type: "TEXT",
  status: "PUBLISHED",
  experience: 50,
  coins: 10,
  translations: [
    { languageCode: "es", title: "", description: "", content: "" },
  ],
};

export const INITIAL_EDIT_LESSON_VALUES: LessonFormValues = {
  ...INITIAL_CREATE_LESSON_VALUES,
  experience: 0,
  coins: 0,
  translations: [],
};
