import type { LessonFormValues, LessonType } from "../types/lesson";
export function isLessonType(value: string): value is LessonType { return ["TEXT", "CODE", "QUIZ", "LIVE"].includes(value); }
export function getLessonValidationError(values: LessonFormValues, requiresCourse: boolean): string | null { if (requiresCourse && !values.courseId) return "admin.validationCourseRequired"; if (values.translations.some((translation) => !translation.title.trim())) return "admin.validationLessonTitlesRequired"; return null; }
