"use client";

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { Code, ChevronRight, Trophy, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import { apiGet } from "../api";

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
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No se encontró el token de autenticación");

        // Fetch modules
        const modulesData: Module[] = await apiGet<Module[]>(
          "/api/modules",
          token
        );

        // Fetch courses for each module
        const modulesWithCourses: ModuleWithCourses[] = await Promise.all(
          modulesData.map(async (mod) => {
            const coursesData: Course[] = await apiGet<Course[]>(
              `/api/modules/${mod._id}/courses`,
              token
            );
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

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) {
      return "/images/default-course.jpg";
    }
    if (imagePath.startsWith("http")) {
      return imagePath;
    }
    // Assuming the backend serves images relative to the API base URL
    return `${process.env.REACT_APP_API_URL || ""}${imagePath}`;
  };

  // Determine background image based on theme
  const getBackgroundImage = () => {
    switch (theme.name) {
      case "dark":
        return "/images/fondo1.jpg";
      case "light":
        return "/images/fondo2.jpg";
      case "pink":
        return "/images/fondo3.jpg";
      default:
        return "/images/fondo4.jpg"; // Fallback
    }
  };

  return (
    <main
      className="font-mono min-h-screen"
      style={{
        background: theme.colors.background,
        color: theme.colors.text,
      }}
    >
      <Navbar />

      {/* Hero Section with Pixel Art Style */}
      <section className="py-20 px-4 text-center relative overflow-hidden min-h-[550px] flex items-center">
        {/* Background with Pixel Art Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{
            backgroundImage: `url(${getBackgroundImage()})`,
            backgroundPosition: "center center",
            backgroundSize: "cover",
            minHeight: "550px",
            width: "100%",
            imageRendering: "pixelated",
          }}
        />
        {/* Overlay for Text Legibility */}
        <div
          className="absolute inset-0"
          style={{
            background: theme.colors.background,
            opacity: theme.name === "light" ? 0.5 : 0.7,
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="mb-6 flex justify-center">
            <Trophy
              className="w-16 h-16"
              style={{ color: theme.colors.accent }}
            />
          </div>
          <h1
            className="text-4xl md:text-5xl mb-4 tracking-wider"
            style={{ color: theme.colors.text }}
          >
            Explora el mundo de <br />
            <span
              className="text-5xl md:text-6xl font-bold mt-2 inline-block tracking-widest"
              style={{ color: theme.colors.accent }}
            >
              Código
            </span>
          </h1>

          <p
            className="max-w-2xl mx-auto text-lg mt-6 border-2 rounded-lg p-4"
            style={{
              color: theme.colors.secondaryText,
              borderColor: theme.colors.border,
              background: theme.colors.card,
            }}
          >
            Empieza tu aventura en la programación con más de 200 horas de
            ejercicios interactivos de programación, combinados con proyectos
            reales. ¡Explora gratis! ✨
          </p>
        </div>
      </section>

      {/* Módulos + Cursos */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        {error && (
          <p
            className="text-center mb-8 p-4 rounded-lg border-2"
            style={{
              color: theme.colors.error,
              background: theme.colors.card,
              borderColor: theme.colors.error,
            }}
          >
            {error}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-lg h-80 animate-pulse border-4"
                style={{
                  background: theme.colors.card,
                  borderColor: theme.colors.border,
                }}
              ></div>
            ))}
          </div>
        ) : (
          modules.map((mod) => (
            <div key={mod._id} className="mb-20 text-center">
              <div className="flex flex-col items-center mb-4">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center mb-4 border-4"
                  style={{
                    background: theme.colors.card,
                    borderColor: theme.colors.border,
                  }}
                >
                  <Code size={28} style={{ color: theme.colors.accent }} />
                </div>
                <h2
                  className="text-3xl tracking-wider pb-2 px-4 inline-block"
                  style={{
                    color: theme.colors.text,
                    borderBottom: `4px solid ${theme.colors.primary}`,
                  }}
                >
                  {mod.title}
                </h2>
              </div>
              <p
                className="mb-8 max-w-3xl mx-auto text-center"
                style={{ color: theme.colors.secondaryText }}
              >
                {mod.description}
              </p>

              <div className="flex flex-wrap justify-center gap-6">
                {mod.courses.map((course) => (
                  <div
                    key={course._id}
                    className="rounded-lg overflow-hidden w-full max-w-sm hover:translate-y-[-4px] cursor-pointer transition-all border-4"
                    style={{
                      background: theme.colors.card,
                      borderColor: theme.colors.border,
                    }}
                    onClick={() => handleCourseClick(course._id)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = theme.colors.accent)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = theme.colors.border)
                    }
                  >
                    <div
                      className="h-40 relative overflow-hidden"
                      style={{
                        borderBottom: `4px solid ${theme.colors.border}`,
                      }}
                    >
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                          backgroundImage: getImageUrl(course.image)
                            ? `url(${getImageUrl(course.image)})`
                            : `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.accent})`,
                          imageRendering: "pixelated",
                        }}
                      ></div>
                    </div>

                    <div className="p-5">
                      <div
                        className="text-xs mb-1"
                        style={{ color: theme.colors.secondaryText }}
                      >
                        CURSO
                      </div>
                      <h3
                        className="text-xl font-bold mb-2"
                        style={{ color: theme.colors.text }}
                      >
                        {course.title}
                      </h3>
                      <p
                        className="text-sm mb-4 line-clamp-2"
                        style={{ color: theme.colors.secondaryText }}
                      >
                        {course.description}
                      </p>

                      <div className="flex items-center justify-between mt-4">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border-2"
                          style={{
                            background: theme.colors.button,
                            color: theme.colors.buttonText,
                            borderColor: theme.colors.accent,
                          }}
                        >
                          <Zap
                            className="w-3 h-3 mr-1"
                            style={{ color: theme.colors.buttonText }}
                          />
                          {course.level}
                        </span>

                        <button
                          onClick={() => handleCourseClick(course._id)}
                          className="text-sm flex items-center px-3 py-1 rounded-md font-bold transition-colors"
                          style={{
                            background: theme.colors.button,
                            color: theme.colors.buttonText,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              theme.colors.accent;
                            e.currentTarget.style.color =
                              theme.colors.buttonText;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background =
                              theme.colors.button;
                            e.currentTarget.style.color =
                              theme.colors.buttonText;
                          }}
                        >
                          Ver lecciones
                          <ChevronRight
                            size={16}
                            className="ml-1"
                            style={{ color: theme.colors.buttonText }}
                          />
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
