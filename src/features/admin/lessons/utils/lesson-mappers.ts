import type {
  LessonDetails,
  LessonFormValues,
  LessonListItem,
  LessonTableRow,
} from "../types/lesson";

function getSpanishTitle(translations: Array<{ title: string; language: { code: string } }>) {
  return translations.find(({ language }) => language.code === "es") ?? translations[0];
}

export function toLessonTableRows(lessons: LessonListItem[], untitledLabel: string): LessonTableRow[] {
  return lessons.map((lesson) => {
    const lessonTranslation = getSpanishTitle(lesson.translations);
    const courseTranslation = lesson.course?.translations
      ? getSpanishTitle(lesson.course.translations)
      : undefined;
    const moduleTranslation = lesson.course?.module?.translations
      ? getSpanishTitle(lesson.course.module.translations)
      : undefined;

    return {
      id: lesson.id,
      title: lessonTranslation?.title ?? untitledLabel,
      course: courseTranslation?.title ?? "-",
      module: moduleTranslation?.title ?? null,
      exercisesCount: lesson.exercises?.length ?? 0,
    };
  });
}

export function toLessonFormValues(lesson: LessonDetails): LessonFormValues {
  return {
    courseId: "",
    order: lesson.order,
    type: lesson.type,
    experience: lesson.experience,
    coins: lesson.coins,
    translations: lesson.translations.map((translation) => ({
      languageCode: translation.language.code,
      title: translation.title,
      description: translation.description ?? "",
      content: translation.content?.markdown ?? "",
    })),
  };
}

export function toLessonPayload(
  values: LessonFormValues,
  includeCourseId: boolean,
) {
  const payload = {
    order: values.order,
    type: values.type,
    experience: values.experience,
    coins: values.coins,
    translations: values.translations.map((translation) => ({
      languageCode: translation.languageCode,
      title: translation.title,
      description: translation.description,
      content: translation.content ? { markdown: translation.content } : null,
    })),
  };

  return includeCourseId ? { courseId: values.courseId, ...payload } : payload;
}
