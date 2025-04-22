"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import Navbar from "../components/Navbar";

interface Exercise {
  order: number;
  title: string;
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
}

export default function CourseLesson() {
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
    <main className="flex flex-col min-h-screen bg-[#0a0e1a]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative w-full h-[400px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{
            backgroundImage: "url('/placeholder.svg?height=400&width=1200')",
          }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-4 pt-16">
          <div className="flex items-center mb-8">
            <div className="bg-gray-700/80 text-white rounded-full px-4 py-1 text-xs font-mono flex items-center">
              <span className="mr-2">•</span>
              <span>{course?.difficulty?.toUpperCase() || "PRINCIPIANTE"}</span>
            </div>
            <div className="ml-2 text-white font-mono text-xs">CURSO</div>
          </div>
          <h1 className="text-6xl font-bold text-white font-mono mb-6 tracking-wide">
            {course?.title || "Curso dinámico"}
          </h1>
          <p className="text-white max-w-xl font-mono leading-relaxed mb-8">
            {course?.description || "Descripción del curso no disponible aún."}
          </p>
          <button className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-6 rounded-md font-mono transition-all transform hover:scale-105 shadow-lg">
            Empieza a aprender
          </button>
        </div>
      </section>

      {/* Course Content */}
      <section className="flex-1 bg-[#0a0e1a] py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row gap-8">
          {/* Left: Lessons */}
          <div className="w-full md:w-2/3">
            <div className="bg-[#111827] rounded-lg overflow-hidden border border-gray-800">
              {lessons.map((lesson, index) => (
                <div key={lesson._id} className="border-b border-gray-800">
                  <button
                    className="w-full flex items-center justify-between p-4 text-white hover:bg-[#1a2234] transition-colors"
                    onClick={() => toggleLesson(index)}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-[#1a2234] flex items-center justify-center mr-4 font-mono">
                        {index + 1}
                      </div>
                      <span className="font-mono text-lg">{lesson.title}</span>
                    </div>
                    <ChevronDown
                      className={`transition-transform ${
                        expandedLesson === index ? "rotate-180" : ""
                      }`}
                      size={20}
                    />
                  </button>
                  {expandedLesson === index && (
                    <div className="p-4 bg-[#0d1424] text-gray-400 font-mono">
                      <p className="mb-4">{lesson.description}</p>
                      <ul className="space-y-3">
                        {lesson.exercises.map((exercise) => (
                          <li
                            key={exercise.order}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center">
                              <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-sm text-white mr-3">
                                {exercise.order}
                              </span>
                              <span>{exercise.title}</span>
                            </div>
                            <button
                              onClick={() =>
                                navigate("/exercise", { state: { exercise } })
                              }
                              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-1 px-4 rounded-md font-mono transition-all"
                            >
                              Iniciar
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Info Cards */}
          <div className="w-full md:w-1/3 space-y-6">
            {/* User Card */}
            <div className="bg-[#111827] rounded-lg p-4 border border-gray-800">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center mr-3">
                  <span className="text-white font-bold">JS</span>
                </div>
                <div>
                  <h3 className="text-white font-mono">jsebas</h3>
                  <p className="text-gray-400 text-sm font-mono">Nivel 2</p>
                </div>
              </div>
              <button className="w-full bg-[#1a2234] hover:bg-[#232e45] text-white font-mono py-2 rounded-md transition-colors">
                Ver perfil
              </button>
            </div>

            {/* Progress Card */}
            <div className="bg-[#111827] rounded-lg p-4 border border-gray-800">
              <h3 className="text-white font-mono mb-4">Progreso del curso</h3>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-blue-500 rounded-sm mr-2"></div>
                    <span className="text-white font-mono text-sm">
                      Ceremonias
                    </span>
                  </div>
                  <span className="text-gray-400 font-mono text-sm">
                    0 / 43
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: "0%" }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-green-500 rounded-sm mr-2"></div>
                    <span className="text-white font-mono text-sm">
                      Proyectos completados
                    </span>
                  </div>
                  <span className="text-gray-400 font-mono text-sm">0 / 2</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: "0%" }}
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
