"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Trash2, Plus, Save, BookOpen, RefreshCw } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Course {
  _id?: string;
  title: string;
  description: string;
  image?: string;
  level: string;
  module: string;
}

const CourseCard = ({
  course,
  onUpdate,
  onDelete,
  onNavigateToLessons,
  isLoading,
}: {
  course: Course;
  onUpdate: (course: Course, imageFile: File | null) => void;
  onDelete: (id?: string) => void;
  onNavigateToLessons: (id?: string) => void;
  isLoading: boolean;
}) => {
  const [localCourse, setLocalCourse] = useState(course);
  const [imageFile, setImageFile] = useState<File | null>(null);

  return (
    <article
      className="p-4 bg-gray-800 rounded-xl border border-gray-700 space-y-4"
      aria-labelledby={`course-title-${course._id}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label
            htmlFor={`title-${course._id}`}
            className="text-sm text-gray-400"
          >
            Título
          </label>
          <input
            id={`title-${course._id}`}
            type="text"
            value={localCourse.title}
            onChange={(e) =>
              setLocalCourse({ ...localCourse, title: e.target.value })
            }
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Título del curso"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor={`description-${course._id}`}
            className="text-sm text-gray-400"
          >
            Descripción
          </label>
          <input
            id={`description-${course._id}`}
            type="text"
            value={localCourse.description}
            onChange={(e) =>
              setLocalCourse({ ...localCourse, description: e.target.value })
            }
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Descripción del curso"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor={`level-${course._id}`}
            className="text-sm text-gray-400"
          >
            Nivel
          </label>
          <select
            id={`level-${course._id}`}
            value={localCourse.level}
            onChange={(e) =>
              setLocalCourse({ ...localCourse, level: e.target.value })
            }
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Nivel del curso"
          >
            <option value="">Selecciona un nivel</option>
            <option value="PRINCIPIANTE">Principiante</option>
            <option value="INTERMEDIO">Intermedio</option>
            <option value="AVANZADO">Avanzado</option>
          </select>
        </div>
        <div className="space-y-2">
          <label
            htmlFor={`image-${course._id}`}
            className="text-sm text-gray-400"
          >
            Imagen
          </label>
          <div className="flex items-center gap-2">
            {localCourse.image && (
              <img
                src={localCourse.image}
                alt={localCourse.title}
                className="w-12 h-12 object-cover rounded"
                onError={(e) => {
                  console.error(`Failed to load image: ${localCourse.image}`);
                  e.currentTarget.src = "/images/default-course.jpg";
                }}
              />
            )}
            <input
              id={`image-${course._id}`}
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) =>
                setImageFile(e.target.files ? e.target.files[0] : null)
              }
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:bg-gray-600 file:text-white hover:file:bg-gray-500"
              aria-label="Subir imagen del curso"
            />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
        <button
          onClick={() => onUpdate(localCourse, imageFile)}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Guardar cambios para el curso ${localCourse.title}`}
        >
          <Save className="w-4 h-4 mr-2" />
          Guardar
        </button>
        <button
          onClick={() => onDelete(course._id)}
          disabled={isLoading}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Eliminar curso ${localCourse.title}`}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Eliminar
        </button>
        <button
          onClick={() => onNavigateToLessons(course._id)}
          disabled={isLoading}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Ver lecciones del curso ${localCourse.title}`}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Ver Lecciones
        </button>
      </div>
    </article>
  );
};

export default function AdminCourses() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [newCourse, setNewCourse] = useState<Course>({
    title: "",
    description: "",
    image: "",
    level: "",
    module: moduleId || "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // URL base del backend
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Obtener token JWT
  const token = localStorage.getItem("token");

  const fetchCourses = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/api/courses/module/${moduleId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = res.data;
      const courseArray = Array.isArray(data) ? data : data ? [data] : [];
      setCourses(courseArray);
    } catch (err) {
      toast.error("Error al obtener cursos. Intenta de nuevo.");
      console.error("Error al obtener cursos:", err);
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  }, [moduleId, API_URL, token]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCreate = async () => {
    if (
      !newCourse.title ||
      !newCourse.description ||
      !newCourse.level ||
      !newCourse.module
    ) {
      toast.error("Todos los campos son obligatorios.");
      return;
    }
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("title", newCourse.title);
      formData.append("description", newCourse.description);
      formData.append("level", newCourse.level);
      formData.append("module", newCourse.module);
      if (imageFile) {
        formData.append("image", imageFile);
      }

      await axios.post(`${API_URL}/api/courses`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      toast.success("Curso creado exitosamente.");
      setNewCourse({
        title: "",
        description: "",
        image: "",
        level: "",
        module: moduleId || "",
      });
      setImageFile(null);
      fetchCourses();
    } catch (err) {
      toast.error("Error al crear curso. Intenta de nuevo.");
      console.error("Error al crear curso:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (course: Course, imageFile: File | null) => {
    if (
      !course._id ||
      !course.title ||
      !course.description ||
      !course.level ||
      !course.module
    ) {
      toast.error("Todos los campos son obligatorios.");
      return;
    }
    try {
      setActionLoading(course._id);
      const formData = new FormData();
      formData.append("title", course.title);
      formData.append("description", course.description);
      formData.append("level", course.level);
      formData.append("module", course.module);
      if (imageFile) {
        formData.append("image", imageFile);
      }

      await axios.put(`${API_URL}/api/courses/${course._id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      toast.success("Curso actualizado exitosamente.");
      fetchCourses();
    } catch (err) {
      toast.error("Error al actualizar curso. Intenta de nuevo.");
      console.error("Error al actualizar curso:", err);
    } finally {
      setActionLoading(null);
      setImageFile(null);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm("¿Estás seguro de que deseas eliminar este curso?")) {
      return;
    }
    try {
      setActionLoading(id);
      await axios.delete(`${API_URL}/api/courses/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      toast.success("Curso eliminado exitosamente.");
      fetchCourses();
    } catch (err) {
      toast.error("Error al eliminar curso. Intenta de nuevo.");
      console.error("Error al eliminar curso:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const navigateToLessons = (courseId?: string) => {
    if (courseId) {
      navigate(`/admin/lessons/${courseId}`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
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
      <header className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <h1 className="text-xl font-bold">Gestión de Cursos</h1>
        <button
          onClick={fetchCourses}
          disabled={isLoading}
          className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refrescar cursos"
          aria-label="Refrescar cursos"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>
      <div className="flex-1 p-6 overflow-auto">
        <section className="mb-6 bg-gray-800 p-4 rounded-xl border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Crear Nuevo Curso
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="new-course-title"
                className="text-sm text-gray-400"
              >
                Título
              </label>
              <input
                id="new-course-title"
                type="text"
                placeholder="Título del Curso"
                value={newCourse.title}
                onChange={(e) =>
                  setNewCourse({ ...newCourse, title: e.target.value })
                }
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-required="true"
                aria-label="Título del nuevo curso"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="new-course-description"
                className="text-sm text-gray-400"
              >
                Descripción
              </label>
              <input
                id="new-course-description"
                type="text"
                placeholder="Descripción"
                value={newCourse.description}
                onChange={(e) =>
                  setNewCourse({ ...newCourse, description: e.target.value })
                }
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-required="true"
                aria-label="Descripción del nuevo curso"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="new-course-level"
                className="text-sm text-gray-400"
              >
                Nivel
              </label>
              <select
                id="new-course-level"
                value={newCourse.level}
                onChange={(e) =>
                  setNewCourse({ ...newCourse, level: e.target.value })
                }
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-required="true"
                aria-label="Nivel del nuevo curso"
              >
                <option value="">Selecciona un nivel</option>
                <option value="PRINCIPIANTE">Principiante</option>
                <option value="INTERMEDIO">Intermedio</option>
                <option value="AVANZADO">Avanzado</option>
              </select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="new-course-image"
                className="text-sm text-gray-400"
              >
                Imagen
              </label>
              <input
                id="new-course-image"
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) =>
                  setImageFile(e.target.files ? e.target.files[0] : null)
                }
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:bg-gray-600 file:text-white hover:file:bg-gray-500"
                aria-label="Subir imagen del nuevo curso"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCreate}
                disabled={isLoading}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Crear nuevo curso"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Curso
              </button>
            </div>
          </div>
        </section>
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Cursos Existentes</h2>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div
                className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"
                aria-label="Cargando cursos"
              ></div>
            </div>
          ) : courses.length > 0 ? (
            <div className="space-y-4">
              {courses.map((course) => (
                <CourseCard
                  key={course._id}
                  course={course}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onNavigateToLessons={navigateToLessons}
                  isLoading={actionLoading === course._id}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-gray-800 rounded-xl border border-gray-700">
              <p className="text-gray-400" aria-live="polite">
                No hay cursos creados para este módulo todavía.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
