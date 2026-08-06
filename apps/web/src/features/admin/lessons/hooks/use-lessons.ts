"use client";

import { useCallback, useEffect, useState } from "react";

import { appToast } from "@/shared/lib/toast";
import { useTranslation } from "@/i18n/useTranslation";

import { lessonsService } from "../services/lessons-service";
import type { LessonListItem } from "../types/lesson";

export function useLessons() {
  const t = useTranslation();
  const [lessons, setLessons] = useState<LessonListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lessonIdToDelete, setLessonIdToDelete] = useState<string | null>(null);

  useEffect(() => {
    const loadLessons = async () => {
      try {
        setLessons(await lessonsService.getLessons());
      } catch {
        setLessons([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadLessons();
  }, []);

  const requestLessonDeletion = useCallback((lessonId: string) => {
    setLessonIdToDelete(lessonId);
  }, []);

  const cancelLessonDeletion = useCallback(() => {
    setLessonIdToDelete(null);
  }, []);

  const confirmLessonDeletion = useCallback(async () => {
    if (!lessonIdToDelete) return;

    try {
      await lessonsService.deleteLesson(lessonIdToDelete);
      setLessons((currentLessons) =>
        currentLessons.filter(({ id }) => id !== lessonIdToDelete),
      );
      setLessonIdToDelete(null);
    } catch {
      appToast.error(t("admin.deleteLessonError"));
    }
  }, [lessonIdToDelete]);

  return {
    lessons,
    isLoading,
    lessonIdToDelete,
    requestLessonDeletion,
    cancelLessonDeletion,
    confirmLessonDeletion,
  };
}
