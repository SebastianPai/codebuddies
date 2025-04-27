"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronDown, Lock, Trophy, Zap, Star } from "lucide-react";
import { toast } from "react-toastify";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

interface Exercise {
  order: number;
  title: string;
  content: string;
  instructions?: string;
  language: string;
  expectedOutput?: string;
}

interface Lesson {
  _id: string;
  title: string;
  description: string;
  exercises: Exercise[];
}

interface Course {
  _id: string;
  title: string;
  difficulty: string;
  description: string;
  image?: string;
}

interface Progress {
  lessonId: string;
  exerciseOrder: number;
  completed: boolean;
  completedAt?: string;
}

interface ErrorResponse {
  message?: string;
}

export default function CourseLesson() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, fetchWithAuth } = useAuth();
  const { theme } = useTheme();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Current theme in CourseLessons:", theme);
  }, [theme]);

  const toggleLesson = (lessonIndex: number) => {
    setExpandedLesson(expandedLesson === lessonIndex ? null : lessonIndex);
  };

  useEffect(() => {
    const fetchCourseAndLessons = async () => {
      if (!id) {
        setError("ID del curso no proporcionado.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [courseRes, lessonRes, progressRes] = await Promise.all([
          fetchWithAuth(`/api/courses/${id}`),
          fetchWithAuth(`/api/courses/${id}/lessons`),
          fetchWithAuth(`/api/progress/${id}/all`),
        ]);

        if (!courseRes.ok) {
          const courseError = (await courseRes
            .json()
            .catch(() => ({}))) as ErrorResponse;
          throw new Error(
            courseError.message ||
              `Error al obtener el curso (status: ${courseRes.status})`
          );
        }
        if (!lessonRes.ok) {
          const lessonError = (await lessonRes
            .json()
            .catch(() => ({}))) as ErrorResponse;
          throw new Error(
            lessonError.message ||
              `Error al obtener las lecciones (status: ${lessonRes.status})`
          );
        }
        if (!progressRes.ok) {
          const progressError = (await progressRes
            .json()
            .catch(() => ({}))) as ErrorResponse;
          throw new Error(
            progressError.message ||
              `Error al obtener el progreso (status: ${progressRes.status})`
          );
        }

        const courseData = await courseRes.json();
        const lessonData = await lessonRes.json();
        const progressData = await progressRes.json();

        setCourse(courseData);
        setLessons(lessonData);
        setProgress(progressData);

        const currentLessonIndex = getCurrentLessonIndex(
          lessonData,
          progressData
        );
        setExpandedLesson(currentLessonIndex);

        console.log("Lessons:", lessonData);
        console.log("Progress:", progressData);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los datos del curso.";
        setError(errorMessage);
        toast.error(errorMessage, { toastId: "fetch-error" });
      } finally {
        setLoading(false);
      }
    };

    fetchCourseAndLessons();
  }, [id, fetchWithAuth]);

  const getCurrentLessonIndex = (lessons: Lesson[], progress: Progress[]) => {
    const sortedLessons = [...lessons].sort((a, b) =>
      a._id.localeCompare(b._id)
    );

    for (let i = 0; i < sortedLessons.length; i++) {
      const lesson = sortedLessons[i];
      const lessonProgress = progress.filter((p) => p.lessonId === lesson._id);
      const exercises = lesson.exercises.sort((a, b) => a.order - b.order);
      const allCompleted = exercises.every((exercise) =>
        lessonProgress.some(
          (p) => p.exerciseOrder === exercise.order && p.completed
        )
      );

      if (!allCompleted) {
        return i;
      }

      if (i === 0 && !lessonProgress.length && exercises.length) {
        return 0;
      }
    }

    return sortedLessons.length - 1;
  };

  const checkExerciseAccess = async (
    lessonId: string,
    exerciseOrder: number,
    lessonIndex: number
  ) => {
    const lessonProgress = progress.filter((p) => p.lessonId === lessonId);
    const isExerciseCompleted = lessonProgress.some(
      (p) => p.exerciseOrder === exerciseOrder && p.completed
    );

    if (isExerciseCompleted) {
      console.log(
        `Access granted: Exercise ${lessonId}/${exerciseOrder} is already completed.`
      );
      return true;
    }

    const isExerciseAccessible =
      exerciseOrder === 1 ||
      lessonProgress.some(
        (p) => p.exerciseOrder === exerciseOrder - 1 && p.completed
      );

    if (isExerciseAccessible) {
      console.log(
        `Access granted: Exercise ${lessonId}/${exerciseOrder} is accessible based on progress.`
      );
      return true;
    }

    if (exerciseOrder === 1 && lessonIndex > 0) {
      const sortedLessons = [...lessons].sort((a, b) =>
        a._id.localeCompare(b._id)
      );
      const prevLesson = sortedLessons[lessonIndex - 1];
      const prevLessonProgress = progress.filter(
        (p) => p.lessonId === prevLesson._id
      );
      const prevLessonExercises = prevLesson.exercises.sort(
        (a, b) => a.order - b.order
      );

      console.log(
        `Fallback check for lesson ${lessonId}, prevLesson ${prevLesson._id}:`,
        {
          prevLessonProgress,
          prevLessonExercises,
        }
      );

      const isPrevLessonCompleted = prevLessonExercises.every((exercise) =>
        prevLessonProgress.some(
          (p) => p.exerciseOrder === exercise.order && p.completed
        )
      );

      if (isPrevLessonCompleted) {
        console.log(
          `Access granted: Previous lesson ${prevLesson._id} is fully completed.`
        );
        toast.info("Acceso permitido: la lección anterior está completada.", {
          toastId: `access-granted-${lessonId}-${exerciseOrder}`,
        });
        return true;
      }
    }

    try {
      const response = await fetchWithAuth(
        `/api/progress/${id}/${lessonId}/${exerciseOrder}/can-access`
      );
      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({}))) as ErrorResponse;
        console.log(
          `Access check failed for ${lessonId}/${exerciseOrder}:`,
          errorData
        );
        toast.warn(
          errorData.message ||
            "Debes completar todos los ejercicios de la lección anterior primero.",
          {
            toastId: `access-error-${lessonId}-${exerciseOrder}`,
          }
        );
        return false;
      }
      const data = await response.json();
      return data.canAccess;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error al verificar el acceso al ejercicio.";
      toast.error(errorMessage, {
        toastId: `access-error-${lessonId}-${exerciseOrder}`,
      });
      console.error(
        `Error in checkExerciseAccess for ${lessonId}/${exerciseOrder}:`,
        err
      );
      return false;
    }
  };

  const handleExerciseStart = async (
    lessonId: string,
    exerciseOrder: number,
    exercise: Exercise,
    lessonIndex: number
  ) => {
    const isAccessible = await checkExerciseAccess(
      lessonId,
      exerciseOrder,
      lessonIndex
    );
    if (isAccessible) {
      navigate(
        `/courses/${id}/lessons/${lessonId}/exercises/${exerciseOrder}`,
        {
          state: {
            courseType: exercise.language,
            exercise,
          },
        }
      );
    } else {
      toast.error("Debes completar los ejercicios anteriores primero.", {
        toastId: `access-denied-${lessonId}-${exerciseOrder}`,
      });
    }
  };

  const isLessonCompleted = (lesson: Lesson, progress: Progress[]) => {
    const lessonProgress = progress.filter((p) => p.lessonId === lesson._id);
    return lesson.exercises.every((exercise) =>
      lessonProgress.some(
        (p) => p.exerciseOrder === exercise.order && p.completed
      )
    );
  };

  const getCurrentExercise = () => {
    if (!lessons.length) return null;

    const sortedLessons = [...lessons].sort((a, b) =>
      a._id.localeCompare(b._id)
    );

    for (let i = 0; i < sortedLessons.length; i++) {
      const lesson = sortedLessons[i];
      const lessonProgress = progress.filter((p) => p.lessonId === lesson._id);
      const exercises = lesson.exercises.sort((a, b) => a.order - b.order);

      if (!lessonProgress.length && exercises.length) {
        return { lessonId: lesson._id, exercise: exercises[0] };
      }

      for (const exercise of exercises) {
        const isCompleted = lessonProgress.some(
          (p) => p.exerciseOrder === exercise.order && p.completed
        );
        if (!isCompleted) {
          return { lessonId: lesson._id, exercise };
        }
      }

      if (isLessonCompleted(lesson, progress) && i < sortedLessons.length - 1) {
        const nextLesson = sortedLessons[i + 1];
        const nextExercises = nextLesson.exercises.sort(
          (a, b) => a.order - b.order
        );
        if (nextExercises.length) {
          return { lessonId: nextLesson._id, exercise: nextExercises[0] };
        }
      }
    }

    return null;
  };

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

  const totalExercises = lessons.reduce(
    (acc, l) => acc + l.exercises.length,
    0
  );
  const completedExercises = progress.filter((p) => p.completed).length;
  const progressPercentage =
    totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;
  const currentExercise = getCurrentExercise();
  const sortedLessons = [...lessons].sort((a, b) => a._id.localeCompare(b._id));

  return (
    <main
      className="flex flex-col min-h-screen font-mono"
      style={{ background: theme.colors.background, color: theme.colors.text }}
    >
      <Navbar />
      <section
        className="relative w-full h-[400px] overflow-hidden"
        style={{ borderBottom: `4px solid ${theme.colors.border}` }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage: course?.image
              ? `url(${course.image})`
              : `url('/placeholder.svg?height=400&width=1200')`,
            imageRendering: "pixelated",
          }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-4 pt-16">
          <div className="flex items-center mb-8">
            <div
              className="rounded-md px-4 py-1 text-xs flex items-center border-2"
              style={{
                background: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              <Zap
                className="w-4 h-4 mr-2"
                style={{ color: theme.colors.accent }}
              />
              <span style={{ color: theme.colors.text }}>
                {course?.difficulty?.toUpperCase() || "PRINCIPIANTE"}
              </span>
            </div>
            <div
              className="ml-2 text-xs"
              style={{ color: theme.colors.secondaryText }}
            >
              CURSO
            </div>
          </div>
          <h1
            className="text-5xl md:text-6xl font-bold mb-6 tracking-wider"
            style={{ color: theme.colors.text }}
          >
            {course?.title || "Curso dinámico"}
          </h1>
          <p
            className="max-w-xl leading-relaxed mb-8 p-4 rounded-lg border-2"
            style={{
              color: theme.colors.secondaryText,
              background: theme.colors.card,
              borderColor: theme.colors.border,
            }}
          >
            {course?.description || "Descripción del curso no disponible aún."}
          </p>
          <button
            className="font-bold py-3 px-6 rounded-md transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed border-4"
            disabled={!currentExercise}
            style={{
              background: currentExercise
                ? theme.colors.button
                : theme.colors.border,
              color: currentExercise
                ? theme.colors.buttonText
                : theme.colors.secondaryText,
              borderColor: theme.colors.border,
            }}
            onClick={() => {
              if (currentExercise) {
                handleExerciseStart(
                  currentExercise.lessonId,
                  currentExercise.exercise.order,
                  currentExercise.exercise,
                  sortedLessons.findIndex(
                    (l) => l._id === currentExercise.lessonId
                  )
                );
              } else {
                toast.info("¡Has completado todas las lecciones del curso!", {
                  toastId: "course-completed",
                });
                navigate("/dashboard");
              }
            }}
            onMouseEnter={(e) => {
              if (currentExercise) {
                e.currentTarget.style.background = theme.colors.accent;
                e.currentTarget.style.color = theme.colors.buttonText;
              }
            }}
            onMouseLeave={(e) => {
              if (currentExercise) {
                e.currentTarget.style.background = theme.colors.button;
                e.currentTarget.style.color = theme.colors.buttonText;
              }
            }}
          >
            {currentExercise ? "Empieza a aprender" : "Curso completado"}
          </button>
        </div>
      </section>

      <section className="flex-1 py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-2/3">
            <div
              className="rounded-lg overflow-hidden border-4"
              style={{
                background: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              {lessons.length === 0 ? (
                <p
                  className="p-4"
                  style={{ color: theme.colors.secondaryText }}
                >
                  No hay lecciones disponibles.
                </p>
              ) : (
                lessons.map((lesson, index) => {
                  const lessonProgress = progress.filter(
                    (p) => p.lessonId === lesson._id
                  );
                  const isCompleted = isLessonCompleted(lesson, progress);
                  const isAccessible =
                    index === 0 ||
                    (index > 0 &&
                      sortedLessons[index - 1].exercises.every((exercise) =>
                        progress.some(
                          (p) =>
                            p.lessonId === sortedLessons[index - 1]._id &&
                            p.exerciseOrder === exercise.order &&
                            p.completed
                        )
                      ));

                  return (
                    <div
                      key={lesson._id}
                      className="border-b-2"
                      style={{ borderColor: theme.colors.border }}
                    >
                      <button
                        className={`w-full flex items-center justify-between p-4 transition-colors ${
                          isAccessible ? "" : "opacity-50"
                        }`}
                        onClick={() => toggleLesson(index)}
                        disabled={!isAccessible}
                        style={{ color: theme.colors.text }}
                      >
                        <div className="flex items-center">
                          <div
                            className={`w-10 h-10 rounded-md flex items-center justify-center mr-4 border-2`}
                            style={{
                              background: isCompleted
                                ? theme.colors.success
                                : isAccessible
                                ? theme.colors.accent
                                : theme.colors.border,
                              borderColor: theme.colors.border,
                              color:
                                isCompleted || isAccessible
                                  ? theme.colors.buttonText
                                  : theme.colors.secondaryText,
                            }}
                          >
                            <span className="font-bold">{index + 1}</span>
                          </div>
                          <span className="text-lg">
                            {lesson.title}
                            {isCompleted && (
                              <Star
                                className="inline-block ml-2 w-4 h-4"
                                style={{ color: theme.colors.accent }}
                              />
                            )}
                          </span>
                        </div>
                        <ChevronDown
                          className={`transition-transform ${
                            expandedLesson === index ? "rotate-180" : ""
                          }`}
                          size={20}
                          style={{ color: theme.colors.text }}
                        />
                      </button>
                      {expandedLesson === index && (
                        <div
                          className="p-4 border-t-2"
                          style={{
                            background: theme.colors.background,
                            color: theme.colors.secondaryText,
                            borderColor: theme.colors.border,
                          }}
                        >
                          <p className="mb-4">{lesson.description}</p>
                          {isCompleted && (
                            <p
                              className="mb-4 p-2 rounded-md border-2"
                              style={{
                                color: theme.colors.success,
                                background: theme.colors.card,
                                borderColor: theme.colors.success,
                              }}
                            >
                              ¡Lección completada! Puedes avanzar a la siguiente
                              lección.
                            </p>
                          )}
                          <ul className="space-y-3">
                            {lesson.exercises.map((exercise) => {
                              const isExerciseCompleted = lessonProgress.some(
                                (p) =>
                                  p.exerciseOrder === exercise.order &&
                                  p.completed
                              );
                              const isExerciseAccessible =
                                isExerciseCompleted ||
                                exercise.order === 1 ||
                                lessonProgress.some(
                                  (p) =>
                                    p.exerciseOrder === exercise.order - 1 &&
                                    p.completed
                                ) ||
                                (index > 0 &&
                                  exercise.order === 1 &&
                                  sortedLessons[index - 1].exercises.every(
                                    (prevExercise) =>
                                      progress.some(
                                        (p) =>
                                          p.lessonId ===
                                            sortedLessons[index - 1]._id &&
                                          p.exerciseOrder ===
                                            prevExercise.order &&
                                          p.completed
                                      )
                                  ));

                              return (
                                <li
                                  key={exercise.order}
                                  className="flex items-center justify-between p-3 rounded-md border-2"
                                  style={{
                                    background: theme.colors.card,
                                    borderColor: theme.colors.border,
                                  }}
                                >
                                  <div className="flex items-center">
                                    <span
                                      className={`w-8 h-8 rounded-md flex items-center justify-center text-sm mr-3`}
                                      style={{
                                        background: isExerciseCompleted
                                          ? theme.colors.success
                                          : isExerciseAccessible
                                          ? theme.colors.button
                                          : theme.colors.border,
                                        color:
                                          isExerciseCompleted ||
                                          isExerciseAccessible
                                            ? theme.colors.buttonText
                                            : theme.colors.secondaryText,
                                      }}
                                    >
                                      {exercise.order}
                                    </span>
                                    <span
                                      style={{
                                        color: isExerciseAccessible
                                          ? theme.colors.text
                                          : theme.colors.secondaryText,
                                      }}
                                    >
                                      {exercise.title}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() =>
                                      handleExerciseStart(
                                        lesson._id,
                                        exercise.order,
                                        exercise,
                                        index
                                      )
                                    }
                                    className="font-bold py-1 px-4 rounded-md transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                      background: isExerciseCompleted
                                        ? theme.colors.success
                                        : isExerciseAccessible
                                        ? theme.colors.button
                                        : theme.colors.border,
                                      color:
                                        isExerciseCompleted ||
                                        isExerciseAccessible
                                          ? theme.colors.buttonText
                                          : theme.colors.secondaryText,
                                      border: `2px solid ${theme.colors.border}`,
                                    }}
                                    disabled={!isExerciseAccessible}
                                    onMouseEnter={(e) => {
                                      if (isExerciseAccessible) {
                                        e.currentTarget.style.background =
                                          theme.colors.button;
                                        e.currentTarget.style.color =
                                          theme.colors.buttonText;
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (isExerciseAccessible) {
                                        e.currentTarget.style.background =
                                          isExerciseCompleted
                                            ? theme.colors.success
                                            : theme.colors.button;
                                        e.currentTarget.style.color =
                                          theme.colors.buttonText;
                                      }
                                    }}
                                  >
                                    {isExerciseCompleted
                                      ? "Completado"
                                      : "Iniciar"}
                                    {!isExerciseCompleted &&
                                      !isExerciseAccessible && (
                                        <Lock
                                          size={14}
                                          className="ml-2"
                                          style={{
                                            color: theme.colors.secondaryText,
                                          }}
                                        />
                                      )}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="w-full md:w-1/3 space-y-6">
            <div
              className="rounded-lg p-4 border-4"
              style={{
                background: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              <div className="flex items-center mb-4">
                <div
                  className="w-12 h-12 rounded-md flex items-center justify-center mr-3 border-2"
                  style={{
                    background: theme.colors.primary,
                    borderColor: theme.colors.border,
                  }}
                >
                  <span
                    className="font-bold"
                    style={{ color: theme.colors.buttonText }}
                  >
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </span>
                </div>
                <div>
                  <h3 style={{ color: theme.colors.text }}>
                    {user?.name || "Usuario"}
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: theme.colors.secondaryText }}
                  >
                    Nivel {user ? 2 : "Desconocido"}
                  </p>
                </div>
              </div>
              <button
                className="w-full py-2 rounded-md transition-colors font-bold border-2"
                onClick={() => navigate("/profile")}
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
                Ver perfil
              </button>
            </div>

            <div
              className="rounded-lg p-4 border-4"
              style={{
                background: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              <h3
                className="mb-4 flex items-center"
                style={{ color: theme.colors.text }}
              >
                <Trophy
                  className="w-5 h-5 mr-2"
                  style={{ color: theme.colors.button }}
                />
                Progreso del curso
              </h3>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div
                      className="w-6 h-6 rounded-md mr-2 border-2"
                      style={{
                        background: theme.colors.button,
                        borderColor: theme.colors.border,
                      }}
                    ></div>
                    <span
                      className="text-sm"
                      style={{ color: theme.colors.text }}
                    >
                      Ejercicios
                    </span>
                  </div>
                  <span
                    className="text-sm"
                    style={{ color: theme.colors.secondaryText }}
                  >
                    {completedExercises} / {totalExercises}
                  </span>
                </div>
                <div
                  className="w-full rounded-md h-4 border-2"
                  style={{
                    background: theme.colors.border,
                    borderColor: theme.colors.border,
                  }}
                >
                  <div
                    className="h-full rounded-sm"
                    style={{
                      background: theme.colors.accent,
                      width: `${progressPercentage}%`,
                    }}
                  ></div>
                </div>
                <div
                  className="mt-2 text-xs text-center"
                  style={{ color: theme.colors.secondaryText }}
                >
                  {Math.round(progressPercentage)}% completado
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
