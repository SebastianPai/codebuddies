import { useEffect, useState, JSX } from "react";
import { useParams, Link } from "react-router-dom";

interface Lesson {
  _id: string;
  title: string;
  order: number;
}

interface Module {
  _id: string;
  title: string;
  description: string;
}

export default function ModuleDetail(): JSX.Element {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [module, setModule] = useState<Module | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchModule = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/modules/${moduleId}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setModule(data);
      } catch (err: any) {
        setError(err.message || "Error al cargar el módulo.");
      }
    };

    const fetchLessons = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/lessons/module/${moduleId}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setLessons(data);
      } catch (err: any) {
        setError(err.message || "Error al cargar las lecciones.");
      }
    };

    if (moduleId) {
      fetchModule();
      fetchLessons();
    }
  }, [moduleId]);

  if (error) {
    return <p className="text-red-500 text-center mt-4">{error}</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {module && (
          <>
            <h1 className="text-3xl font-bold text-indigo-600 mb-2">
              {module.title}
            </h1>
            <p className="text-gray-600 mb-6">{module.description}</p>
          </>
        )}

        <div className="space-y-3">
          {lessons.map((lesson) => (
            <Link
              to={`/learn/lesson/${lesson._id}`}
              key={lesson._id}
              className="block bg-white p-4 rounded-xl shadow hover:shadow-md transition border border-gray-200"
            >
              <span className="font-semibold text-indigo-500 mr-2">
                Lección {lesson.order}:
              </span>
              <span className="text-gray-800">{lesson.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
