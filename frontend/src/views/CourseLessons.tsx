"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import Navbar from "../components/Navbar";
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
  image?: string; // Add the image field
}

export default function CourseLesson() {
  const { theme } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);

  const toggleLesson = (lessonIndex: number) => {
    setExpandedLesson(expandedLesson === lessonIndex ? null : lessonIndex);
  };

  useEffect(() => {
    const fetchCourseAndLessons = async () => {
      try {
        const [courseRes, lessonRes] = await Promise.all([
          fetch(`http://localhost:5000/api/courses/${id}`),
          fetch(`http://localhost:5000/api/courses/${id}/lessons`),
        ]);

        if (!courseRes.ok || !lessonRes.ok) {
          throw new Error("Failed to fetch course or lessons");
        }

        const courseData = await courseRes.json();
        const lessonData = await lessonRes.json();

        setCourse(courseData);
        setLessons(lessonData);
      } catch (error) {
        console.error("Error fetching course or lessons:", error);
      }
    };

    if (id) fetchCourseAndLessons();
  }, [id]);

  return (
    <main
      className="flex flex-col min-h-screen"
      style={{ background: theme.colors.background }}
    >
      <Navbar />

      {/* Hero Section */}
      <section className="relative w-full h-[400px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage: course?.image
              ? `url(${course.image})`
              : "url('/placeholder.svg?height=400&width=1200')", // Fallback to placeholder if no image
          }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-4 pt-16">
          <div className="flex items-center mb-8">
            <div
              className="rounded-full px-4 py-1 text-xs font-mono flex items-center"
              style={{
                background: theme.colors.border,
                color: theme.colors.text,
              }}
            >
              <span className="mr-2">•</span>
              <span>{course?.difficulty?.toUpperCase() || "PRINCIPIANTE"}</span>
            </div>
            <div
              className="ml-2 font-mono text-xs"
              style={{ color: theme.colors.text }}
            >
              CURSO
            </div>
          </div>
          <h1
            className="text-6xl font-bold font-mono mb-6 tracking-wide"
            style={{ color: theme.colors.text }}
          >
            {course?.title || "Curso dinámico"}
          </h1>
          <p
            className="max-w-xl font-mono leading-relaxed mb-8"
            style={{ color: theme.colors.secondary }}
          >
            {course?.description || "Descripción del curso no disponible aún."}
          </p>
          <button
            className="font-bold py-3 px-6 rounded-md font-mono transition-all transform hover:scale-105 shadow-lg"
            style={{
              background: theme.colors.accent,
              color: theme.colors.buttonText,
            }}
          >
            Empieza a aprender
          </button>
        </div>
      </section>

      {/* Course Content */}
      <section
        className="flex-1 py-8"
        style={{ background: theme.colors.background }}
      >
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row gap-8">
          {/* Left: Lessons */}
          <div className="w-full md:w-2/3">
            <div
              className="rounded-lg overflow-hidden border"
              style={{
                background: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              {lessons.length === 0 ? (
                <p
                  className="font-mono p-4"
                  style={{ color: theme.colors.secondary }}
                >
                  No hay lecciones disponibles.
                </p>
              ) : (
                lessons.map((lesson, index) => (
                  <div
                    key={lesson._id}
                    className="border-b"
                    style={{ borderColor: theme.colors.border }}
                  >
                    <button
                      className="w-full flex items-center justify-between p-4 transition-colors"
                      style={{ color: theme.colors.text }}
                      onClick={() => toggleLesson(index)}
                    >
                      <div className="flex items-center">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center mr-4 font-mono"
                          style={{ background: theme.colors.primary }}
                        >
                          <span style={{ color: theme.colors.buttonText }}>
                            {index + 1}
                          </span>
                        </div>
                        <span className="font-mono text-lg">
                          {lesson.title}
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
                        className="p-4 font-mono"
                        style={{
                          background: theme.colors.codeBackground,
                          color: theme.colors.codeText,
                        }}
                      >
                        <p className="mb-4">{lesson.description}</p>
                        <ul className="space-y-3">
                          {lesson.exercises.map((exercise) => (
                            <li
                              key={exercise.order}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center">
                                <span
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-sm mr-3"
                                  style={{
                                    background: theme.colors.accent,
                                    color: theme.colors.buttonText,
                                  }}
                                >
                                  {exercise.order}
                                </span>
                                <span style={{ color: theme.colors.text }}>
                                  {exercise.title}
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  navigate(
                                    `/courses/${id}/lessons/${lesson._id}/exercises/${exercise.order}`,
                                    {
                                      state: {
                                        courseType: exercise.language,
                                        exercise,
                                      },
                                    }
                                  )
                                }
                                className="font-bold py-1 px-4 rounded-md font-mono transition-all"
                                style={{
                                  background: theme.colors.accent,
                                  color: theme.colors.buttonText,
                                }}
                              >
                                Iniciar
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Info Cards */}
          <div className="w-full md:w-1/3 space-y-6">
            {/* User Card */}
            <div
              className="rounded-lg p-4 border"
              style={{
                background: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              <div className="flex items-center mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
                  style={{ background: theme.colors.primary }}
                >
                  <span
                    className="font-bold"
                    style={{ color: theme.colors.buttonText }}
                  >
                    JS
                  </span>
                </div>
                <div>
                  <h3
                    className="font-mono"
                    style={{ color: theme.colors.text }}
                  >
                    jsebas
                  </h3>
                  <p
                    className="text-sm font-mono"
                    style={{ color: theme.colors.secondary }}
                  >
                    Nivel 2
                  </p>
                </div>
              </div>
              <button
                className="w-full font-mono py-2 rounded-md transition-colors"
                style={{
                  background: theme.colors.primary,
                  color: theme.colors.buttonText,
                }}
              >
                Ver perfil
              </button>
            </div>

            {/* Progress Card */}
            <div
              className="rounded-lg p-4 border"
              style={{
                background: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              <h3
                className="font-mono mb-4"
                style={{ color: theme.colors.text }}
              >
                Progreso del curso
              </h3>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div
                      className="w-6 h-6 rounded-sm mr-2"
                      style={{ background: theme.colors.accent }}
                    ></div>
                    <span
                      className="font-mono text-sm"
                      style={{ color: theme.colors.text }}
                    >
                      Ceremonias
                    </span>
                  </div>
                  <span
                    className="font-mono text-sm"
                    style={{ color: theme.colors.secondary }}
                  >
                    0 / 43
                  </span>
                </div>
                <div
                  className="w-full rounded-full h-2"
                  style={{ background: theme.colors.border }}
                >
                  <div
                    className="h-2 rounded-full"
                    style={{ background: theme.colors.accent, width: "0%" }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div
                      className="w-6 h-6 rounded-sm mr-2"
                      style={{ background: theme.colors.button }}
                    ></div>
                    <span
                      className="font-mono text-sm"
                      style={{ color: theme.colors.text }}
                    >
                      Proyectos completados
                    </span>
                  </div>
                  <span
                    className="font-mono text-sm"
                    style={{ color: theme.colors.secondary }}
                  >
                    0 / 2
                  </span>
                </div>
                <div
                  className="w-full rounded-full h-2"
                  style={{ background: theme.colors.border }}
                >
                  <div
                    className="h-2 rounded-full"
                    style={{ background: theme.colors.button, width: "0%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
