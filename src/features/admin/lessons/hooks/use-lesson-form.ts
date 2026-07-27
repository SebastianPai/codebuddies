"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/shared/hooks/use-auth";
import { useTranslation } from "@/i18n/useTranslation";

import {
  INITIAL_CREATE_LESSON_VALUES,
  INITIAL_EDIT_LESSON_VALUES,
  LESSON_REDIRECT_DELAY_MS,
  LESSONS_ROUTE,
} from "../constants/lessons";
import { lessonsService } from "../services/lessons-service";
import type { LessonFormValues } from "../types/lesson";
import { toLessonFormValues } from "../utils/lesson-mappers";
import {
  getLessonValidationError,
  isLessonType,
} from "../validations/lesson-validation";

type LessonFormMode = "create" | "edit";

interface UseLessonFormOptions {
  mode: LessonFormMode;
  lessonId?: string;
}

function getInitialValues(mode: LessonFormMode): LessonFormValues {
  const values =
    mode === "create" ? INITIAL_CREATE_LESSON_VALUES : INITIAL_EDIT_LESSON_VALUES;

  return { ...values, translations: [...values.translations] };
}

export function useLessonForm({ mode, lessonId }: UseLessonFormOptions) {
  const t = useTranslation();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [values, setValues] = useState<LessonFormValues>(() => getInitialValues(mode));
  const [courses, setCourses] = useState<Awaited<ReturnType<typeof lessonsService.getCourses>>>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(mode === "create");
  const [isLoadingLesson, setIsLoadingLesson] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (mode !== "create") return;

    const loadCourses = async () => {
      try {
        const loadedCourses = await lessonsService.getCourses();
        setCourses(loadedCourses);
        if (loadedCourses.length > 0) {
          setValues((currentValues) => ({
            ...currentValues,
            courseId: loadedCourses[0].id,
          }));
        }
      } catch {
        setError(t("admin.loadCoursesError"));
      } finally {
        setIsLoadingCourses(false);
      }
    };

    void loadCourses();
  }, [mode]);

  useEffect(() => {
    if (mode !== "edit" || !lessonId) return;

    const loadLesson = async () => {
      try {
        setValues(toLessonFormValues(await lessonsService.getLesson(lessonId)));
      } catch (caughtError: unknown) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : t("admin.loadLessonError"),
        );
      } finally {
        setIsLoadingLesson(false);
      }
    };

    void loadLesson();
  }, [lessonId, mode]);

  const updateValues = useCallback(
    (updates: Partial<LessonFormValues>) => {
      setValues((currentValues) => ({ ...currentValues, ...updates }));
    },
    [],
  );

  const updateLessonType = useCallback((value: string) => {
    if (isLessonType(value)) {
      setValues((currentValues) => ({ ...currentValues, type: value }));
    }
  }, []);

  const goToLessons = useCallback(() => {
    router.push(LESSONS_ROUTE);
  }, [router]);

  const saveLesson = useCallback(async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const validationError = getLessonValidationError(values, mode === "create");
    if (validationError) {
      setError(t(validationError));
      return;
    }

    if (mode === "edit" && !lessonId) return;

    setIsSaving(true);
    setError(null);

    try {
      if (mode === "create") {
        await lessonsService.createLesson(values);
      } else if (lessonId) {
        await lessonsService.updateLesson(lessonId, values);
      }

      setIsSuccess(true);
      window.setTimeout(goToLessons, LESSON_REDIRECT_DELAY_MS);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : mode === "create" ? t("admin.createLessonError") : t("admin.saveLessonChangesError"),
      );
    } finally {
      setIsSaving(false);
    }
  }, [goToLessons, isAuthenticated, lessonId, mode, router, values]);

  const isSubmitDisabled =
    isSaving ||
    isLoadingCourses ||
    Boolean(getLessonValidationError(values, mode === "create"));

  return {
    values,
    courses,
    isLoadingCourses,
    isLoadingLesson,
    isSaving,
    error,
    isSuccess,
    isSubmitDisabled,
    updateValues,
    updateLessonType,
    saveLesson,
    goToLessons,
  };
}
