import type { CourseListItem, CourseTableRow } from "../types/course";

export function toCourseTableRows(courses: CourseListItem[]): CourseTableRow[] {
  return courses.map((course) => ({
    id: course.id,
    title: course.title,
    moduleTitle: course.module?.title ?? "",
    difficulty: course.difficulty,
    lessons: course.lessons.length,
  }));
}
