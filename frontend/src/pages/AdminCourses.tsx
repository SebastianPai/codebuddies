import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

interface Course {
  _id?: string;
  title: string;
  description: string;
  level: string;
  module: string;
}

export default function AdminCourses() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [newCourse, setNewCourse] = useState<Course>({
    title: "",
    description: "",
    level: "",
    module: moduleId || "",
  });

  useEffect(() => {
    fetchCourses();
  }, [moduleId]);

  const fetchCourses = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/courses/module/${moduleId}`
      );
      const data = res.data;
      const courseArray = Array.isArray(data) ? data : data ? [data] : [];
      setCourses(courseArray);
    } catch (err) {
      console.error("Error al obtener cursos:", err);
      setCourses([]);
    }
  };

  const handleCreate = async () => {
    try {
      await axios.post("http://localhost:5000/api/courses", newCourse);
      setNewCourse({
        title: "",
        description: "",
        level: "",
        module: moduleId || "",
      });
      fetchCourses();
    } catch (err) {
      console.error("Error al crear curso:", err);
    }
  };

  const handleUpdate = async (course: Course) => {
    try {
      await axios.put(
        `http://localhost:5000/api/courses/${course._id}`,
        course
      );
      fetchCourses();
    } catch (err) {
      console.error("Error al actualizar curso:", err);
    }
  };

  const handleDelete = async (id?: string) => {
    try {
      await axios.delete(`http://localhost:5000/api/courses/${id}`);
      fetchCourses();
    } catch (err) {
      console.error("Error al eliminar curso:", err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Cursos del Módulo</h1>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <input
          type="text"
          placeholder="Título del Curso"
          value={newCourse.title}
          onChange={(e) =>
            setNewCourse({ ...newCourse, title: e.target.value })
          }
          className="p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Descripción"
          value={newCourse.description}
          onChange={(e) =>
            setNewCourse({ ...newCourse, description: e.target.value })
          }
          className="p-2 border rounded"
        />
        <select
          value={newCourse.level}
          onChange={(e) =>
            setNewCourse({ ...newCourse, level: e.target.value })
          }
          className="p-2 border rounded"
        >
          <option value="">Dificultad</option>
          <option value="PRINCIPIANTE">Principiante</option>
          <option value="INTERMEDIO">Intermedio</option>
          <option value="AVANZADO">Avanzado</option>
        </select>
        <button
          onClick={handleCreate}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Crear Curso
        </button>
      </div>

      {courses.length > 0 ? (
        <ul className="space-y-4">
          {courses.map((course, idx) => (
            <li
              key={course._id}
              className="p-4 bg-gray-100 rounded shadow space-y-2"
            >
              <input
                type="text"
                value={course.title}
                onChange={(e) =>
                  setCourses((prev) =>
                    prev.map((c, i) =>
                      i === idx ? { ...c, title: e.target.value } : c
                    )
                  )
                }
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                value={course.description}
                onChange={(e) =>
                  setCourses((prev) =>
                    prev.map((c, i) =>
                      i === idx ? { ...c, description: e.target.value } : c
                    )
                  )
                }
                className="w-full p-2 border rounded"
              />
              <select
                value={course.level}
                onChange={(e) =>
                  setCourses((prev) =>
                    prev.map((c, i) =>
                      i === idx ? { ...c, level: e.target.value } : c
                    )
                  )
                }
                className="w-full p-2 border rounded"
              >
                <option value="PRINCIPIANTE">Principiante</option>
                <option value="INTERMEDIO">Intermedio</option>
                <option value="AVANZADO">Avanzado</option>
              </select>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  onClick={() => handleUpdate(course)}
                  className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
                >
                  Guardar
                </button>
                <button
                  onClick={() => handleDelete(course._id)}
                  className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => navigate(`/admin/lessons/${course._id}`)}
                  className="bg-purple-600 text-white px-4 py-1 rounded hover:bg-purple-700"
                >
                  Ver Lecciones
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-600">No hay cursos para este módulo aún.</p>
      )}
    </div>
  );
}
