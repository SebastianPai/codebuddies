"use client";

import { useCallback, useEffect, useState } from "react";

import { toast } from "@/shared/lib/toast";
import { useTranslation } from "@/i18n/useTranslation";

import { coursesService } from "../services/courses-service";
import type { CourseListItem } from "../types/course";

export function useCourses() {
  const t = useTranslation();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [courseIdToDelete, setCourseIdToDelete] = useState<string | null>(null);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setCourses(await coursesService.getCourses());
      } catch {
        setCourses([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadCourses();
  }, []);

  const requestCourseDeletion = useCallback((courseId: string) => {
    setCourseIdToDelete(courseId);
  }, []);

  const cancelCourseDeletion = useCallback(() => {
    setCourseIdToDelete(null);
  }, []);

  const confirmCourseDeletion = useCallback(async () => {
    if (!courseIdToDelete) return;

    try {
      await coursesService.deleteCourse(courseIdToDelete);
      setCourses((currentCourses) =>
        currentCourses.filter(({ id }) => id !== courseIdToDelete),
      );
      setCourseIdToDelete(null);
    } catch {
      toast.error(t("admin.deleteCourseError"));
    }
  }, [courseIdToDelete]);

  return {
    courses,
    isLoading,
    courseIdToDelete,
    requestCourseDeletion,
    cancelCourseDeletion,
    confirmCourseDeletion,
  };
}
