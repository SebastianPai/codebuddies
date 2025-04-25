"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Code, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";

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
  const { theme } = useTheme();
  const [modules, setModules] = useState<ModuleWithCourses[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchModulesAndCourses = async () => {
      try {
        setLoading(true);
        const resModules = await fetch("http://localhost:5000/api/modules", {
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Si usas cookies o autenticación
        });
        if (!resModules.ok) {
          throw new Error(`Error al cargar módulos: ${resModules.statusText}`);
        }
        const modulesData: Module[] = await resModules.json();

        const modulesWithCourses: ModuleWithCourses[] = await Promise.all(
          modulesData.map(async (mod) => {
            const resCourses = await fetch(
              `http://localhost:5000/api/modules/${mod._id}/courses`,
              {
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: "include",
              }
            );
            if (!resCourses.ok) {
              throw new Error(
                `Error al cargar cursos para el módulo ${mod._id}: ${resCourses.statusText}`
              );
            }
            const coursesData: Course[] = await resCourses.json();
            return {
              ...mod,
              courses: coursesData,
            };
          })
        );

        setModules(modulesWithCourses);
      } catch (err: any) {
        console.error("Error en fetchModulesAndCourses:", err);
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

  // Función para construir la URL completa de la imagen
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) {
      return "/images/default-course.jpg"; // Imagen por defecto si no hay imagen
    }
    // Si la imagen ya es una URL completa, devolverla tal cual
    if (imagePath.startsWith("http")) {
      return imagePath;
    }
    // Si la imagen es una ruta relativa, añadir el prefijo del backend
    const fullUrl = `http://localhost:5000${imagePath}`;
    console.log("Generated image URL:", fullUrl); // Depuración
    return fullUrl;
  };

  return (
    <main
      style={{ background: theme.colors.background, color: theme.colors.text }}
    >
      <Navbar />

      {/* Hero Section with Centered Background Image */}
      <section
        className="py-20 px-4 text-center relative overflow-hidden min-h-[550px] flex items-center"
        style={{ background: theme.colors.background }}
      >
        {/* Background Image with 16:9 Aspect Ratio */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{
            backgroundImage: "url('/images/fondo7.jpeg')",
            backgroundPosition: "center center",
            backgroundSize: "cover",
            minHeight: "550px",
            width: "100%",
            filter: "blur(1px)",
          }}
        />
        {/* Overlay for Text Legibility */}
        <div
          className="absolute inset-0"
          style={{
            background:
              theme.name === "light"
                ? "rgba(255, 255, 255, 0.5)"
                : "rgba(0, 0, 0, 0.5)",
          }}
        />
        <div className="relative z-10 max-w-5xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-mono mb-4">
            Explora el mundo de <br />
            <span
              className="text-5xl md:text-6xl font-bold mt-2 inline-block"
              style={{ color: theme.colors.accent }}
            >
              Código
            </span>
          </h1>

          <p
            className="max-w-2xl mx-auto text-lg mt-6"
            style={{ color: theme.colors.secondary }}
          >
            Empieza tu aventura en la programación con más de 200 horas de
            ejercicios interactivos de programación, combinados con proyectos
            reales. ¡Explora gratis! ✨
          </p>
        </div>
      </section>

      {/* Módulos + Cursos */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        {error && <p className="text-red-500 text-center mb-8">{error}</p>}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-lg h-80 animate-pulse"
                style={{ background: theme.colors.card }}
              ></div>
            ))}
          </div>
        ) : (
          modules.map((mod) => (
            <div key={mod._id} className="mb-20 text-center">
              <div className="flex flex-col items-center mb-4">
                <Code
                  style={{ color: theme.colors.accent }}
                  className="mb-2"
                  size={28}
                />
                <h2 className="text-3xl font-mono">{mod.title}</h2>
              </div>
              <p
                className="mb-8 max-w-3xl mx-auto text-center"
                style={{ color: theme.colors.secondary }}
              >
                {mod.description}
              </p>

              <div className="flex flex-wrap justify-center gap-6">
                {mod.courses.map((course) => (
                  <div
                    key={course._id}
                    className="rounded-lg overflow-hidden w-full max-w-sm hover:shadow-lg transition-all hover:translate-y-[-4px] cursor-pointer"
                    style={{ background: theme.colors.card }}
                    onClick={() => handleCourseClick(course._id)}
                  >
                    <div className="h-40 relative overflow-hidden">
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                          backgroundImage: getImageUrl(course.image)
                            ? `url(${getImageUrl(course.image)})`
                            : `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.accent})`,
                        }}
                      ></div>
                    </div>

                    <div className="p-5">
                      <div
                        className="text-xs mb-1"
                        style={{ color: theme.colors.secondary }}
                      >
                        CURSO
                      </div>
                      <h3 className="text-xl font-bold mb-2">{course.title}</h3>
                      <p
                        className="text-sm mb-4 line-clamp-2"
                        style={{ color: theme.colors.secondary }}
                      >
                        {course.description}
                      </p>

                      <div className="flex items-center justify-between mt-4">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: theme.colors.button,
                            color: theme.colors.buttonText,
                          }}
                        >
                          {course.level}
                        </span>

                        <button
                          onClick={() => handleCourseClick(course._id)}
                          className="text-sm flex items-center"
                          style={{ color: theme.colors.accent }}
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
