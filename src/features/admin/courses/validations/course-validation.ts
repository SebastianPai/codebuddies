import type { CourseDifficulty, CourseFormValues } from "../types/course";
export function isCourseDifficulty(value: string): value is CourseDifficulty { return ["EASY", "MEDIUM", "HARD"].includes(value); }
export function getCourseValidationError(values: CourseFormValues): string | null { if (!values.moduleId) return "admin.validationModuleRequired"; if (values.translations.some((translation) => !translation.title.trim())) return "admin.validationTitlesRequired"; return null; }
