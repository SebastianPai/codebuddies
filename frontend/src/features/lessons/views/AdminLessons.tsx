"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Trash2,
  Plus,
  Save,
  BookOpen,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Exercise {
  order: number;
  title: string;
  content: string;
  instructions?: string;
  language: "javascript" | "python" | "html" | "css" | "c" | "java" | "markup";
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
  description: string;
  difficulty: string;
}

const LessonCard = ({
  lesson,
  onUpdate,
  onDelete,
  onViewExercise,
}: {
  lesson: Lesson;
  onUpdate: (id: string, updatedLesson: Partial<Lesson>) => void;
  onDelete: (id: string) => void;
  onViewExercise: (lessonId: string, exerciseOrder: number) => void;
}) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleUpdate = () => {
    if (!title || !description) {
      toast.error("El título y la descripción son obligatorios.");
      return;
    }
    onUpdate(lesson._id, { title, description });
  };

  return (
    <article
      className="p-4 bg-gray-800 rounded-xl border border-gray-700 space-y-4"
      aria-labelledby={`lesson-title-${lesson._id}`}
    >
      <div className="space-y-2">
        <label
          htmlFor={`title-${lesson._id}`}
          className="text-sm text-gray-400"
        >
          Título
        </label>
        <input
          id={`title-${lesson._id}`}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Título de la lección"
        />
      </div>
      <div className="space-y-2">
        <label
          htmlFor={`description-${lesson._id}`}
          className="text-sm text-gray-400"
        >
          Descripción
        </label>
        <textarea
          id={`description-${lesson._id}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          aria-label="Descripción de la lección"
        />
      </div>
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
        <button
          onClick={handleUpdate}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
          aria-label={`Guardar cambios para la lección ${lesson.title}`}
        >
          <Save className="w-4 h-4 mr-2" />
          Guardar
        </button>
        <button
          onClick={() => onDelete(lesson._id)}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center"
          aria-label={`Eliminar lección ${lesson.title}`}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Eliminar
        </button>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center"
          aria-label={`${
            isExpanded ? "Ocultar" : "Mostrar"
          } ejercicios de la lección ${lesson.title}`}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 mr-2" />
          ) : (
            <ChevronDown className="w-4 h-4 mr-2" />
          )}
          {isExpanded ? "Ocultar Ejercicios" : "Mostrar Ejercicios"}
        </button>
        <button
          onClick={() => navigate(`/admin/exercise/${lesson._id}`)}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center"
          aria-label={`Crear nuevo ejercicio para la lección ${lesson.title}`}
        >
          <Plus className="w-4 h-4 mr-2" />
          Crear Ejercicio
        </button>
      </div>
      {isExpanded && (
        <div className="pt-2">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">
            Ejercicios
          </h4>
          {lesson.exercises.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay ejercicios.</p>
          ) : (
            <ul className="space-y-2">
              {lesson.exercises.map((exercise) => (
                <li
                  key={exercise.order}
                  className="flex justify-between items-center text-sm bg-gray-700 p-2 rounded-md"
                >
                  <span>
                    <strong>{exercise.order}.</strong> {exercise.title}
                  </span>
                  <button
                    onClick={() => onViewExercise(lesson._id, exercise.order)}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                    aria-label={`Ver ejercicio ${exercise.title}`}
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
};

const AdminLessons = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLesson, setNewLesson] = useState({ title: "", description: "" });

  // URL base del backend
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Obtener token JWT
  const token = localStorage.getItem("token");

  const fetchCourseAndLessons = useCallback(async () => {
    if (!courseId) {
      toast.error("ID del curso no proporcionado.");
      navigate("/admin/modules");
      return;
    }
    try {
      setLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [courseRes, lessonsRes] = await Promise.all([
        axios.get(`${API_URL}/api/courses/${courseId}`, { headers }),
        axios.get(`${API_URL}/api/courses/${courseId}/lessons`, { headers }),
      ]);
      setCourse(courseRes.data);
      setLessons(lessonsRes.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error("Sesión expirada. Por favor, inicia sesión nuevamente.");
        navigate("/login");
      } else if (error.response?.status === 404) {
        toast.error("Curso no encontrado. Verifica el ID del curso.");
        navigate("/admin/modules");
      } else {
        toast.error("No se pudieron cargar los datos. Intenta de nuevo.");
        console.error("Error al cargar curso o lecciones:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [courseId, navigate, API_URL, token]);

  useEffect(() => {
    fetchCourseAndLessons();
  }, [fetchCourseAndLessons]);

  const handleCreateLesson = async () => {
    if (!newLesson.title || !newLesson.description) {
      toast.error("El título y la descripción son obligatorios.");
      return;
    }
    try {
      setLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(
        `${API_URL}/api/lessons`,
        {
          ...newLesson,
          course: courseId,
        },
        { headers }
      );
      setLessons([...lessons, res.data]);
      setNewLesson({ title: "", description: "" });
      toast.success("Lección creada exitosamente.");
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error("Sesión expirada. Por favor, inicia sesión nuevamente.");
        navigate("/login");
      } else {
        toast.error("No se pudo crear la lección. Intenta de nuevo.");
        console.error("Error al crear lección:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLesson = async (
    id: string,
    updatedLesson: Partial<Lesson>
  ) => {
    try {
      setLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.put(
        `${API_URL}/api/lessons/${id}`,
        updatedLesson,
        { headers }
      );
      setLessons((prev) =>
        prev.map((lesson) => (lesson._id === id ? res.data : lesson))
      );
      toast.success("Lección actualizada exitosamente.");
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error("Sesión expirada. Por favor, inicia sesión nuevamente.");
        navigate("/login");
      } else {
        toast.error("No se pudo actualizar la lección. Intenta de nuevo.");
        console.error("Error al actualizar lección:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta lección?"))
      return;
    try {
      setLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(`${API_URL}/api/lessons/${id}`, { headers });
      setLessons((prev) => prev.filter((lesson) => lesson._id !== id));
      toast.success("Lección eliminada exitosamente.");
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error("Sesión expirada. Por favor, inicia sesión nuevamente.");
        navigate("/login");
      } else {
        toast.error("No se pudo eliminar la lección. Intenta de nuevo.");
        console.error("Error al eliminar lección:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8 bg-[#0f1729] text-white">
        <div
          className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"
          aria-label="Cargando lecciones"
        ></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0f1729] text-white">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />

      <header className="flex items-center justify-between p-4 bg-[#1a1a2e] border-b border-gray-800">
        <h1 className="text-xl font-bold">Gestión de Lecciones</h1>
        <button
          onClick={fetchCourseAndLessons}
          disabled={loading}
          className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refrescar lecciones"
          aria-label="Refrescar lecciones"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 p-6 overflow-auto">
        {course ? (
          <header className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-white">{course.title}</h2>
            <p className="text-gray-400 mt-2">{course.description}</p>
            <span className="inline-block mt-3 px-3 py-1 bg-blue-700 text-blue-200 text-sm font-medium rounded-full">
              Dificultad: {course.difficulty}
            </span>
          </header>
        ) : (
          <div className="mb-6 text-center">
            <p className="text-gray-400">Cargando información del curso...</p>
          </div>
        )}

        <section className="mb-6 bg-[#1a1a2e] p-4 rounded-xl border border-gray-800">
          <h2 className="text-lg font-semibold mb-4 flex items-center text-white">
            <Plus className="w-5 h-5 mr-2" />
            Crear Nueva Lección
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="new-lesson-title"
                className="text-sm text-gray-400"
              >
                Título
              </label>
              <input
                id="new-lesson-title"
                type="text"
                value={newLesson.title}
                onChange={(e) =>
                  setNewLesson({ ...newLesson, title: e.target.value })
                }
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-required="true"
                aria-label="Título de la nueva lección"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="new-lesson-description"
                className="text-sm text-gray-400"
              >
                Descripción
              </label>
              <input
                id="new-lesson-description"
                type="text"
                value={newLesson.description}
                onChange={(e) =>
                  setNewLesson({ ...newLesson, description: e.target.value })
                }
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-required="true"
                aria-label="Descripción de la nueva lección"
              />
            </div>
          </div>
          <button
            onClick={handleCreateLesson}
            disabled={loading}
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Crear nueva lección"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear Lección
          </button>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Lecciones</h2>
          {lessons.length === 0 ? (
            <div className="p-8 text-center bg-[#1a1a2e] rounded-xl border border-gray-800">
              <p className="text-gray-400" aria-live="polite">
                Este curso aún no tiene lecciones.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {lessons.map((lesson) => (
                <LessonCard
                  key={lesson._id}
                  lesson={lesson}
                  onUpdate={handleUpdateLesson}
                  onDelete={handleDeleteLesson}
                  onViewExercise={(lessonId, order) =>
                    navigate(`/admin/exercise/${lessonId}/${order}`)
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminLessons;
