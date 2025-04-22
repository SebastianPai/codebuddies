"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Code, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Module {
  _id: string;
  title: string;
  description: string;
  level: string;
  image: string;
}

interface Course {
  _id: string;
  title: string;
  description: string;
  image: string;
  level: string;
}

interface ModuleWithCourses extends Module {
  courses: Course[];
}

export default function Learn() {
  const [modules, setModules] = useState<ModuleWithCourses[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchModulesAndCourses = async () => {
      try {
        setLoading(true);
        const resModules = await fetch("http://localhost:5000/api/modules");
        const modulesData: Module[] = await resModules.json();
        if (!resModules.ok) throw new Error("Error al cargar módulos");

        const modulesWithCourses: ModuleWithCourses[] = await Promise.all(
          modulesData.map(async (mod) => {
            const resCourses = await fetch(
              `http://localhost:5000/api/modules/${mod._id}/courses`
            );
            const coursesData: Course[] = await resCourses.json();
            return {
              ...mod,
              courses: coursesData,
            };
          })
        );

        setModules(modulesWithCourses);
      } catch (err: any) {
        setError(err.message || "Error general al cargar los datos");
      } finally {
        setLoading(false);
      }
    };

    fetchModulesAndCourses();
  }, []);

  const handleCourseClick = (courseId: string) => {
    navigate(`/learn/course/${courseId}`);
  };

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-[#0a0e1a]">
        <h1 className="text-4xl md:text-5xl font-mono mb-4">
          Explora el mundo de <br />
          <span className="text-5xl md:text-6xl font-bold mt-2 inline-block">
            Código
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg text-gray-300 mt-6">
          Empieza tu aventura en la programación con más de 200 horas de
          ejercicios interactivos de programación, combinados con proyectos
          reales. ¡Explora gratis! ✨
        </p>
      </section>

      {/* Módulos + Cursos */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        {error && <p className="text-red-500 text-center mb-8">{error}</p>}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[#151a2d] rounded-lg h-80 animate-pulse"
              ></div>
            ))}
          </div>
        ) : (
          modules.map((mod) => (
            <div key={mod._id} className="mb-20 text-center">
              <div className="flex flex-col items-center mb-4">
                <Code className="text-green-400 mb-2" size={28} />
                <h2 className="text-3xl font-mono">{mod.title}</h2>
              </div>
              <p className="text-gray-300 mb-8 max-w-3xl mx-auto text-center">
                {mod.description}
              </p>

              <div className="flex flex-wrap justify-center gap-6">
                {mod.courses.map((course) => (
                  <div
                    key={course._id}
                    className="bg-[#151a2d] rounded-lg overflow-hidden w-full max-w-sm hover:shadow-lg transition-all hover:translate-y-[-4px] cursor-pointer"
                    onClick={() => handleCourseClick(course._id)}
                  >
                    <div className="h-40 bg-gradient-to-r from-purple-900 to-blue-900 relative overflow-hidden">
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${course.image})` }}
                      ></div>
                    </div>

                    <div className="p-5">
                      <div className="text-xs text-gray-400 mb-1">CURSO</div>
                      <h3 className="text-xl font-bold mb-2">{course.title}</h3>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                        {course.description}
                      </p>

                      <div className="flex items-center justify-between mt-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-opacity-10 bg-gray-700 text-gray-300">
                          {course.level}
                        </span>

                        <button
                          onClick={() => handleCourseClick(course._id)}
                          className="text-sm text-purple-400 hover:text-purple-300 flex items-center"
                        >
                          Ver lecciones
                          <ChevronRight size={16} className="ml-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
