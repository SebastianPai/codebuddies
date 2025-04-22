"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

interface Exercise {
  order: number;
  title: string;
  content: string;
}

interface Lesson {
  _id: string;
  title: string;
  description: string;
  exercises: Exercise[];
}

export default function LessonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/lessons/${id}`);
        const data = await res.json();
        setLesson(data);
      } catch (error) {
        console.error("Error fetching lesson:", error);
      }
    };

    if (id) fetchLesson();
  }, [id]);

  if (!lesson) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] text-white flex items-center justify-center font-mono">
        Cargando lección...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white font-mono">
      <Navbar />

      <section className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-4">{lesson.title}</h1>
        <p className="text-gray-400 mb-8">{lesson.description}</p>

        <div className="space-y-4">
          {lesson.exercises.map((exercise) => (
            <div
              key={exercise.order}
              className="bg-[#111827] p-4 rounded-lg border border-gray-700 flex items-center justify-between"
            >
              <div>
                <p className="text-lg">
                  {exercise.order}. {exercise.title}
                </p>
              </div>
              <button
                onClick={() => navigate("/exercise", { state: { exercise } })}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded-md transition-all"
              >
                Iniciar
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
