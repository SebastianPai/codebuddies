"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/common/Navbar";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { CourseHeader } from "../components/CourseHeader";
import { LessonList } from "../components/LessonList";
import { UserProfileCard } from "../components/UserProfileCard";
import { ProgressCard } from "../components/ProgressCard";
import { useCourseData } from "../hooks/useCourseData";
import { useExerciseAccess } from "../hooks/useExerciseAccess";
import { useCurrentExercise } from "../hooks/useCurrentExercise";
import { Exercise } from "@/types/course";

export default function CourseLesson() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const { course, lessons, progress, loading, error } = useCourseData();
  const { checkExerciseAccess } = useExerciseAccess(lessons, progress);
  const { currentExercise, currentLessonIndex } = useCurrentExercise(
    lessons,
    progress
  );

  // Redirigir a login si no está autenticado
  useEffect(() => {
    if (!authLoading && (!user || !localStorage.getItem("token"))) {
      navigate("/login", { replace: true, state: { fromCourse: true } });
    }
  }, [user, authLoading, navigate]);

  // No renderizar nada mientras se verifica la autenticación
  if (authLoading) {
    return null; // Opcionalmente, mostrar un spinner global si prefieres
  }

  // Solo renderizar si el usuario está autenticado
  if (!user || !localStorage.getItem("token")) {
    return null; // Esto no debería ejecutarse debido al navigate, pero es una salvaguarda
  }

  if (loading) {
    return (
      <div
        className="flex justify-center items-center min-h-screen"
        style={{ background: theme.colors.background }}
      >
        <div
          className="animate-spin rounded-lg h-12 w-12 border-4"
          style={{
            borderTopColor: theme.colors.accent,
            borderRightColor: theme.colors.accent,
            borderBottomColor: "transparent",
            borderLeftColor: "transparent",
          }}
        ></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center min-h-screen p-4 font-mono"
        style={{
          background: theme.colors.background,
          color: theme.colors.text,
        }}
      >
        <Navbar />
        <div
          className="mt-16 p-6 rounded-lg max-w-2xl w-full text-center border-4"
          style={{
            background: theme.colors.card,
            borderColor: theme.colors.error,
          }}
        >
          <p className="text-lg mb-4" style={{ color: theme.colors.error }}>
            {error}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 px-6 py-3 rounded-md font-bold transition-colors border-4"
            style={{
              background: theme.colors.button,
              color: theme.colors.buttonText,
              borderColor: theme.colors.border,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.colors.accent;
              e.currentTarget.style.color = theme.colors.buttonText;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.colors.button;
              e.currentTarget.style.color = theme.colors.buttonText;
            }}
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleExerciseStart = async (
    lessonId: string,
    order: number,
    exercise: Exercise,
    lessonIndex: number
  ) => {
    const isAccessible = await checkExerciseAccess(
      lessonId,
      order,
      lessonIndex
    );
    if (isAccessible) {
      navigate(
        `/courses/${course?._id}/lessons/${lessonId}/exercises/${order}`,
        {
          state: { courseType: exercise.language, exercise },
        }
      );
    }
  };

  return (
    <main
      className="flex flex-col min-h-screen font-mono"
      style={{ background: theme.colors.background, color: theme.colors.text }}
    >
      <Navbar />
      <CourseHeader
        course={course}
        currentExercise={currentExercise}
        handleExerciseStart={handleExerciseStart}
        lessonIndex={currentLessonIndex}
      />
      <section className="flex-1 py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-2/3">
            <LessonList
              lessons={lessons}
              progress={progress}
              onExerciseStart={handleExerciseStart}
              defaultExpandedIndex={currentLessonIndex}
            />
          </div>
          <div className="w-full md:w-1/3 space-y-6">
            <UserProfileCard />
            <ProgressCard lessons={lessons} progress={progress} />
          </div>
        </div>
      </section>
    </main>
  );
}
