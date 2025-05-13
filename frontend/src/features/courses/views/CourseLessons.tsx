// frontend/src/pages/CourseLesson.tsx
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
import { AchievementsCard } from "../components/AchievementsCard";
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

  // Datos de ejemplo para logros (puedes reemplazar con datos reales)
  const achievements = [
    {
      id: "1",
      title: "Te Uniste a CodeBuddies",
      description:
        "Gracias, estamos infitamente agradecidos por confiar en nosotros.",
      date: "2025-05-10",
    },
    {
      id: "2",
      title: "Los logros estan en desarrollo",
      description: "Espero no te moleste, apenas hay una persona trabajando :(",
      date: "2025-05-09",
    },
  ];

  useEffect(() => {
    if (!authLoading && (!user || !localStorage.getItem("token"))) {
      navigate("/login", { replace: true, state: { fromCourse: true } });
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
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

  if (!user || !localStorage.getItem("token")) {
    return null;
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
        className="flex flex-col items-center min-h-screen p-4 font-jersey"
        style={{
          background: theme.colors.background,
          color: theme.colors.text,
        }}
      >
        <Navbar />
        <div
          className="mt-16 p-6 rounded-xl max-w-2xl w-full text-center border-4 animate-course-item shine"
          style={{
            background: `linear-gradient(135deg, ${theme.colors.card} 0%, ${theme.colors.background} 100%)`,
            borderColor: theme.colors.border,
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
          }}
        >
          <p className="text-lg mb-4" style={{ color: theme.colors.error }}>
            {error}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 px-6 py-3 rounded-lg font-bold transition-transform hover:scale-105 border-4 course-pulse"
            style={{
              background: theme.colors.accenttwo,
              color: theme.colors.buttonText,
              borderColor: theme.colors.border,
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.1)",
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
      className="flex flex-col min-h-screen font-jersey"
      style={{ background: theme.colors.background, color: theme.colors.text }}
    >
      <style>
        {`
          @keyframes course-item {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-course-item {
            animation: course-item 0.5s ease-out forwards;
          }
          @keyframes course-pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.2); }
            50% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(0, 0, 0, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
          }
          .course-pulse {
            animation: course-pulse 2s infinite;
          }
          @keyframes shine {
            0% { box-shadow: 0 0 0 0 ${theme.colors.accent}50; }
            50% { box-shadow: 0 0 20px 10px ${theme.colors.accent}20; }
            100% { box-shadow: 0 0 0 0 ${theme.colors.accent}50; }
          }
          .shine {
            animation: shine 2s ease-in-out;
          }
        `}
      </style>
      <Navbar />
      <CourseHeader
        course={course}
        currentExercise={currentExercise}
        handleExerciseStart={handleExerciseStart}
        lessonIndex={currentLessonIndex}
      />
      <section className="flex-1 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-8">
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
            <AchievementsCard achievements={achievements} />
          </div>
        </div>
      </section>
      {/* Footer Personalizado */}
      <footer
        className="py-8 px-4 sm:px-6 lg:px-8 text-center"
        style={{ background: theme.colors.card, color: theme.colors.text }}
      >
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <img
            src="/images/bitzi2.png"
            alt="Bitzi Footer"
            className="w-10 h-10 mb-4 rounded-full object-contain"
            style={{ border: `2px solid ${theme.colors.accent}` }}
            onError={(e) => {
              e.currentTarget.src = "/images/default-bitzi.jpg";
            }}
          />
          <p
            className="text-sm md:text-base mb-2"
            style={{ color: theme.colors.text }}
          >
            Creado con pasión por Jhon Sebastian Pai
            <a
              href="https://www.linkedin.com/in/sebastian-pai"
              target="_blank"
              rel="noopener noreferrer"
              className="linkedin-link ml-1"
              style={{ color: theme.colors.accent }}
            >
              Conéctate
            </a>
          </p>
          <p
            className="text-xs md:text-sm"
            style={{ color: theme.colors.secondaryText }}
          >
            © 2025 CodeBuddies. ¡Hecho para inspirar programadores!
          </p>
        </div>
      </footer>
    </main>
  );
}
