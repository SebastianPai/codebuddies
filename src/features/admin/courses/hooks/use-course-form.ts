"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/shared/hooks/use-auth";
import { useObjectUrl } from "@/shared/hooks/use-object-url";
import { useTranslation } from "@/i18n/useTranslation";

import {
  COURSE_REDIRECT_DELAY_MS,
  COURSES_ROUTE,
  INITIAL_COURSE_VALUES,
} from "../constants/courses";
import { coursesService } from "../services/courses-service";
import type { CourseDetails, CourseFormValues } from "../types/course";
import { getCourseValidationError, isCourseDifficulty } from "../validations/course-validation";

type CourseFormMode = "create" | "edit";

interface UseCourseFormOptions {
  mode: CourseFormMode;
  courseId?: string;
}

export function useCourseForm({ mode, courseId }: UseCourseFormOptions) {
  const t = useTranslation();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [values, setValues] = useState<CourseFormValues>(INITIAL_COURSE_VALUES);
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [modules, setModules] = useState<Awaited<ReturnType<typeof coursesService.getModules>>>([]);
  const [allCourses, setAllCourses] = useState<Awaited<ReturnType<typeof coursesService.getCourses>>>([]);
  const [allCategories, setAllCategories] = useState<Awaited<ReturnType<typeof coursesService.getCategories>>>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoadingCourse, setIsLoadingCourse] = useState(mode === "edit");
  const [isLoadingModules, setIsLoadingModules] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const imagePreview = useObjectUrl(imageFile, course?.imageUrl ?? null);

  useEffect(() => {
    const loadModules = async () => {
      try {
        const loadedModules = await coursesService.getModules();
        setModules(loadedModules);
        if (mode === "create" && loadedModules.length > 0) {
          setValues((currentValues) => ({
            ...currentValues,
            moduleId: loadedModules[0].id,
          }));
        }
      } catch {
        setError(t("admin.loadModulesError"));
      } finally {
        setIsLoadingModules(false);
      }
    };

    void loadModules();
  }, [mode]);

  useEffect(() => {
    coursesService.getCourses().then(setAllCourses).catch(() => {});
    coursesService.getCategories().then(setAllCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !courseId) return;

    const loadCourse = async () => {
      try {
        const loadedCourse = await coursesService.getCourse(courseId);
        setCourse(loadedCourse);
        setValues({
          moduleId: loadedCourse.moduleId,
          difficulty: loadedCourse.difficulty,
          freeLimit: loadedCourse.freeLimit,
          status: loadedCourse.status ?? "PUBLISHED",
          translations: loadedCourse.translations,
          prerequisiteCourseIds: loadedCourse.prerequisites?.map((p) => p.id) ?? [],
          categoryIds: loadedCourse.categoryIds ?? [],
        });
      } catch {
        setError(t("admin.loadCourseError"));
      } finally {
        setIsLoadingCourse(false);
      }
    };

    void loadCourse();
  }, [courseId, mode]);

  const updateValues = useCallback((updates: Partial<CourseFormValues>) => {
    setValues((currentValues) => ({ ...currentValues, ...updates }));
  }, []);

  const updateDifficulty = useCallback((value: string) => {
    if (isCourseDifficulty(value)) {
      setValues((currentValues) => ({ ...currentValues, difficulty: value }));
    }
  }, []);

  const goToCourses = useCallback(() => {
    router.push(COURSES_ROUTE);
  }, [router]);

  const saveCourse = useCallback(async () => {
    if (mode === "create" && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (mode === "create") {
      const validationError = getCourseValidationError(values);
      if (validationError) {
        setError(t(validationError));
        return;
      }
    }

    if (mode === "edit" && (!courseId || !course)) return;

    setIsSaving(true);
    setError(null);

    try {
      const imageUrl = await coursesService.uploadImage(
        imageFile,
        course?.imageUrl ?? null,
      );

      if (mode === "create") {
        await coursesService.createCourse(values, imageUrl);
      } else if (courseId) {
        await coursesService.updateCourse(courseId, values, imageUrl);
      }

      setIsSuccess(true);
      window.setTimeout(goToCourses, COURSE_REDIRECT_DELAY_MS);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : mode === "create" ? t("admin.courseCreateError") : t("admin.courseUpdateError"),
      );
    } finally {
      setIsSaving(false);
    }
  }, [course, courseId, goToCourses, imageFile, isAuthenticated, mode, router, values]);

  const isSubmitDisabled =
    isSaving ||
    isLoadingModules ||
    (mode === "create" && Boolean(getCourseValidationError(values)));

  return {
    values,
    course,
    modules,
    allCourses,
    allCategories,
    imagePreview,
    isLoadingCourse,
    isLoadingModules,
    isSaving,
    error,
    isSuccess,
    isSubmitDisabled,
    updateValues,
    updateDifficulty,
    setImageFile,
    saveCourse,
    goToCourses,
  };
}
