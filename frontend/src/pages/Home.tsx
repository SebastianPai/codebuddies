"use client";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Trophy,
  Calendar,
  User,
  Code,
  Github,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import Navbar from "../components/Navbar";

interface Module {
  _id: string;
  title: string;
}

interface Course {
  _id: string;
  title: string;
  description: string;
  image: string;
  level: string;
}

export default function Home() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Estados para módulos, cursos y módulo seleccionado
  const [modules, setModules] = useState<Module[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Obtener módulos y cursos
  useEffect(() => {
    const fetchModulesAndCourses = async () => {
      try {
        setLoading(true);
        setError("");

        // Obtener módulos
        const resModules = await fetch("http://localhost:5000/api/modules", {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        if (!resModules.ok) {
          throw new Error(`Error al cargar módulos: ${resModules.statusText}`);
        }
        const modulesData: Module[] = await resModules.json();
        setModules(modulesData);

        // Si hay módulos, seleccionar el primero y cargar sus cursos
        if (modulesData.length > 0) {
          const firstModuleId = modulesData[0]._id;
          setSelectedModule(firstModuleId);
          const resCourses = await fetch(
            `http://localhost:5000/api/modules/${firstModuleId}/courses`,
            {
              headers: { "Content-Type": "application/json" },
              credentials: "include",
            }
          );
          if (!resCourses.ok) {
            throw new Error(
              `Error al cargar cursos para el módulo ${firstModuleId}: ${resCourses.statusText}`
            );
          }
          const coursesData: Course[] = await resCourses.json();
          setCourses(coursesData);
        }
      } catch (err: any) {
        console.error("Error en fetchModulesAndCourses:", err);
        setError(err.message || "Error al cargar los cursos");
      } finally {
        setLoading(false);
      }
    };

    fetchModulesAndCourses();
  }, []);

  // Cambiar el módulo seleccionado y cargar sus cursos
  const handleModuleChange = async (moduleId: string) => {
    try {
      setSelectedModule(moduleId);
      setLoading(true);
      setError("");
      const resCourses = await fetch(
        `http://localhost:5000/api/modules/${moduleId}/courses`,
        {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (!resCourses.ok) {
        throw new Error(
          `Error al cargar cursos para el módulo ${moduleId}: ${resCourses.statusText}`
        );
      }
      const coursesData: Course[] = await resCourses.json();
      setCourses(coursesData);
    } catch (err: any) {
      console.error("Error al cambiar módulo:", err);
      setError(err.message || "Error al cargar los cursos");
    } finally {
      setLoading(false);
    }
  };

  // Navegar a la página del curso
  const handleCourseClick = (courseId: string) => {
    navigate(`/learn/course/${courseId}`);
  };

  // Construir la URL de la imagen
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) {
      return "/images/default-course.jpg";
    }
    if (imagePath.startsWith("http")) {
      return imagePath;
    }
    return `http://localhost:5000${imagePath}`;
  };

  return (
    <div
      className="flex flex-col min-h-screen font-jersey"
      style={{ background: theme.colors.background, color: theme.colors.text }}
    >
      <Navbar />
      <main className="flex-grow">
        {/* Hero Section */}
        <section
          className="relative py-20 px-4 overflow-hidden"
          style={{ borderBottom: `4px solid ${theme.colors.border}` }}
        >
          <div className="absolute inset-0 z-0 opacity-20">
            {Array.from({ length: 20 }).map((_, rowIndex) => (
              <div key={`row-${rowIndex}`} className="flex">
                {Array.from({ length: 40 }).map((_, colIndex) => (
                  <div
                    key={`pixel-${rowIndex}-${colIndex}`}
                    className={`w-8 h-8 ${
                      Math.random() > 0.5 ? "bg-[#a855f7]" : "bg-[#1e40af]"
                    } opacity-${Math.floor(Math.random() * 40) + 10}`}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="container mx-auto relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1
                className="text-4xl md:text-6xl font-jersey mb-6 leading-tight p-6 rounded-xl shadow-lg transform hover:scale-[1.02] transition duration-500"
                style={{
                  color: theme.colors.text,
                  border: `4px solid ${theme.colors.border}`,
                  background: theme.colors.card,
                }}
              >
                ¡Aprende a programar viviendo una aventura épica!
              </h1>
              <p
                className="text-xl md:text-2xl mb-8 p-4 rounded-lg"
                style={{
                  color: theme.colors.secondaryText,
                  background: theme.colors.card,
                  border: `2px solid ${theme.colors.border}`,
                }}
              >
                Completa misiones, sube de nivel y domina el código.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  to="/login"
                  className="px-8 py-4 rounded-xl text-xl font-bold flex items-center justify-center hover:scale-105 transition duration-300"
                  style={{
                    background: theme.colors.button,
                    border: `4px solid ${theme.colors.border}`,
                    color: theme.colors.buttonText,
                  }}
                >
                  Iniciar Sesión
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/register"
                  className="px-8 py-4 rounded-xl text-xl font-bold flex items-center justify-center hover:scale-105 transition duration-300"
                  style={{
                    background: theme.colors.accenttwo,
                    border: `4px solid ${theme.colors.border}`,
                    color: theme.colors.buttonText,
                  }}
                >
                  Registrarse
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* What is CodeBuddies Section */}
        <section
          className="py-16 px-4"
          style={{ background: theme.colors.background }}
        >
          <div className="container mx-auto">
            <div className="max-w-3xl mx-auto">
              <h2
                className="text-3xl md:text-4xl font-bold mb-8 text-center pb-4"
                style={{
                  color: theme.colors.accent,
                  borderBottom: `4px solid ${theme.colors.border}`,
                }}
              >
                ¿Qué es CodeBuddies?
              </h2>
              <div
                className="rounded-xl p-6 md:p-8 shadow-lg transform hover:scale-[1.01] transition duration-500"
                style={{
                  background: theme.colors.card,
                  border: `4px solid ${theme.colors.border}`,
                }}
              >
                <p className="text-lg md:text-xl leading-relaxed">
                  <span
                    style={{
                      color: theme.colors.success,
                      fontWeight: "bold",
                    }}
                  >
                    CodeBuddies
                  </span>{" "}
                  es una plataforma de aprendizaje de programación que convierte
                  el proceso en una aventura épica estilo arcade.
                </p>
                <p className="text-lg md:text-xl leading-relaxed mt-4">
                  Aquí no solo aprenderás a programar, sino que vivirás una
                  experiencia gamificada donde cada línea de código te acerca
                  más a convertirte en un verdadero maestro del desarrollo.
                </p>
                <div
                  className="mt-6 p-4 rounded-lg font-mono text-sm"
                  style={{
                    background: theme.colors.card,
                    border: `2px solid ${theme.colors.border}`,
                    color: theme.colors.secondaryText,
                  }}
                >
                  <div style={{ color: theme.colors.success }}>
                    // Tu aventura comienza aquí
                  </div>
                  <div>
                    function{" "}
                    <span style={{ color: theme.colors.primary }}>
                      iniciarAventura
                    </span>
                    () {"{"}
                  </div>
                  <div className="pl-4">
                    const{" "}
                    <span style={{ color: theme.colors.accent }}>
                      developer
                    </span>{" "}
                    = new{" "}
                    <span style={{ color: theme.colors.primary }}>
                      CodeBuddy
                    </span>
                    ();
                  </div>
                  <div className="pl-4">
                    <span style={{ color: theme.colors.accent }}>
                      developer
                    </span>
                    .comenzarMisión();
                  </div>
                  <div className="pl-4">
                    return{" "}
                    <span style={{ color: theme.colors.accent }}>
                      developer
                    </span>
                    .obtenerExperiencia();
                  </div>
                  <div>{"}"}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Explore Courses Section */}
        <section
          className="py-16 px-4"
          style={{ background: theme.colors.background }}
        >
          <div className="container mx-auto">
            <h2
              className="text-3xl md:text-4xl font-bold mb-8 text-center pb-4"
              style={{
                color: theme.colors.accent,
                borderBottom: `4px solid ${theme.colors.border}`,
              }}
            >
              Explora Nuestros Cursos
            </h2>
            {error && (
              <p
                className="text-center mb-8"
                style={{ color: theme.colors.error }}
              >
                {error}
              </p>
            )}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-lg h-64 animate-pulse"
                    style={{ background: theme.colors.card }}
                  ></div>
                ))}
              </div>
            ) : (
              <>
                {/* Module Filters */}
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  {modules.map((mod) => (
                    <button
                      key={mod._id}
                      onClick={() => handleModuleChange(mod._id)}
                      className="px-4 py-2 rounded-md font-bold transition-all"
                      style={{
                        background:
                          selectedModule === mod._id
                            ? theme.colors.accent
                            : theme.colors.card,
                        color:
                          selectedModule === mod._id
                            ? theme.colors.buttonText
                            : theme.colors.text,
                        border: `2px solid ${theme.colors.border}`,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                      }
                    >
                      {mod.title}
                    </button>
                  ))}
                </div>
                {/* Courses List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.length > 0 ? (
                    courses.map((course) => (
                      <div
                        key={course._id}
                        className="rounded-lg overflow-hidden hover:shadow-lg transition-all hover:translate-y-[-4px] cursor-pointer"
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
                          <div className="flex items-center justify-between">
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
                              style={{ color: theme.colors.accenttwo }}
                            >
                              Ver curso
                              <ChevronRight size={16} className="ml-1" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p
                      className="text-center col-span-full"
                      style={{ color: theme.colors.secondaryText }}
                    >
                      No hay cursos disponibles para este módulo.
                    </p>
                  )}
                </div>
                {/* Link to Learn Page */}
                <div className="text-center mt-8">
                  <Link
                    to="/learn"
                    className="px-6 py-3 rounded-md font-bold inline-flex items-center hover:scale-105 transition duration-300"
                    style={{
                      background: theme.colors.accenttwo,
                      color: theme.colors.buttonText,
                      border: `2px solid ${theme.colors.border}`,
                    }}
                  >
                    Ver todos los cursos
                    <ChevronRight size={20} className="ml-2" />
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section
          className="py-16 px-4"
          style={{
            background: theme.colors.background,
            borderTop: `4px solid ${theme.colors.border}`,
          }}
        >
          <div className="container mx-auto">
            <h2
              className="text-3xl md:text-4xl font-bold mb-12 text-center"
              style={{ color: theme.colors.accent }}
            >
              Características Épicas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div
                className="rounded-xl p-6 shadow-lg transform hover:scale-105 transition duration-300"
                style={{
                  background: theme.colors.card,
                  border: `4px solid ${theme.colors.border}`,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.border = `4px solid ${theme.colors.accent}`)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.border = `4px solid ${theme.colors.border}`)
                }
              >
                <div
                  className="w-16 h-16 rounded-lg mb-4 flex items-center justify-center"
                  style={{
                    background: theme.colors.button,
                    border: `2px solid ${theme.colors.border}`,
                  }}
                >
                  <Code
                    className="w-8 h-8"
                    style={{ color: theme.colors.buttonText }}
                  />
                </div>
                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: theme.colors.primary }}
                >
                  Aprendizaje Divertido
                </h3>
                <p style={{ color: theme.colors.secondaryText }}>
                  Aprende conceptos de programación a través de misiones y
                  desafíos que parecen videojuegos.
                </p>
              </div>

              <div
                className="rounded-xl p-6 shadow-lg transform hover:scale-105 transition duration-300"
                style={{
                  background: theme.colors.card,
                  border: `4px solid ${theme.colors.border}`,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.border = `4px solid ${theme.colors.accent}`)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.border = `4px solid ${theme.colors.border}`)
                }
              >
                <div
                  className="w-16 h-16 rounded-lg mb-4 flex items-center justify-center"
                  style={{
                    background: theme.colors.button,
                    border: `2px solid ${theme.colors.border}`,
                  }}
                >
                  <Trophy
                    className="w-8 h-8"
                    style={{ color: theme.colors.buttonText }}
                  />
                </div>
                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: theme.colors.primary }}
                >
                  Rankings Semanales
                </h3>
                <p style={{ color: theme.colors.secondaryText }}>
                  Compite con otros CodeBuddies y alcanza la cima de la tabla de
                  clasificación.
                </p>
              </div>

              <div
                className="rounded-xl p-6 shadow-lg transform hover:scale-105 transition duration-300"
                style={{
                  background: theme.colors.card,
                  border: `4px solid ${theme.colors.border}`,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.border = `4px solid ${theme.colors.accent}`)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.border = `4px solid ${theme.colors.border}`)
                }
              >
                <div
                  className="w-16 h-16 rounded-lg mb-4 flex items-center justify-center"
                  style={{
                    background: theme.colors.button,
                    border: `2px solid ${theme.colors.border}`,
                  }}
                >
                  <Calendar
                    className="w-8 h-8"
                    style={{ color: theme.colors.buttonText }}
                  />
                </div>
                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: theme.colors.primary }}
                >
                  Misiones Diarias
                </h3>
                <p style={{ color: theme.colors.secondaryText }}>
                  Completa desafíos diarios para mantener tu racha y ganar
                  recompensas especiales.
                </p>
              </div>

              <div
                className="rounded-xl p-6 shadow-lg transform hover:scale-105 transition duration-300"
                style={{
                  background: theme.colors.card,
                  border: `4px solid ${theme.colors.border}`,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.border = `4px solid ${theme.colors.accent}`)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.border = `4px solid ${theme.colors.border}`)
                }
              >
                <div
                  className="w-16 h-16 rounded-lg mb-4 flex items-center justify-center"
                  style={{
                    background: theme.colors.button,
                    border: `2px solid ${theme.colors.border}`,
                  }}
                >
                  <User
                    className="w-8 h-8"
                    style={{ color: theme.colors.buttonText }}
                  />
                </div>
                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: theme.colors.primary }}
                >
                  Avatares Personalizables
                </h3>
                <p style={{ color: theme.colors.secondaryText }}>
                  Personaliza tu avatar con elementos que desbloqueas al
                  completar misiones.
                </p>
              </div>

              <div
                className="rounded-xl p-6 shadow-lg transform hover:scale-105 transition duration-300 md:col-span-2 lg:col-span-1"
                style={{
                  background: theme.colors.card,
                  border: `4px solid ${theme.colors.border}`,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.border = `4px solid ${theme.colors.accent}`)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.border = `4px solid ${theme.colors.border}`)
                }
              >
                <div
                  className="w-16 h-16 rounded-lg mb-4 flex items-center justify-center"
                  style={{
                    background: theme.colors.button,
                    border: `2px solid ${theme.colors.border}`,
                  }}
                >
                  <Code
                    className="w-8 h-8"
                    style={{ color: theme.colors.buttonText }}
                  />
                </div>
                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: theme.colors.primary }}
                >
                  Retos de Código
                </h3>
                <p style={{ color: theme.colors.secondaryText }}>
                  Enfrenta desafíos de programación que ponen a prueba tus
                  habilidades y te ayudan a mejorar.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section
          className="py-16 px-4"
          style={{
            background: theme.colors.card,
            borderTop: `4px solid ${theme.colors.border}`,
            borderBottom: `4px solid ${theme.colors.border}`,
          }}
        >
          <div className="container mx-auto text-center">
            <div
              className="max-w-2xl mx-auto p-8 rounded-xl shadow-lg"
              style={{
                background: theme.colors.background,
                border: `4px solid ${theme.colors.accent}`,
              }}
            >
              <h2
                className="text-3xl font-bold mb-4"
                style={{ color: theme.colors.text }}
              >
                ¿Listo para la aventura?
              </h2>
              <p
                className="text-xl mb-8"
                style={{ color: theme.colors.secondaryText }}
              >
                Únete a miles de CodeBuddies que ya están dominando el código
                mientras se divierten.
              </p>
              <Link
                to="/register"
                className="px-8 py-4 rounded-xl text-xl font-bold hover:scale-105 transition duration-300"
                style={{
                  background: theme.colors.button,
                  border: `4px solid ${theme.colors.border}`,
                  color: theme.colors.buttonText,
                }}
              >
                ¡Comienza Tu Aventura Ahora!
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="py-8 px-4"
        style={{
          background: theme.colors.card,
          borderTop: `4px solid ${theme.colors.border}`,
        }}
      >
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div
              className="text-xl font-bold mb-4 md:mb-0"
              style={{ color: theme.colors.accent }}
            >
              CodeBuddies
            </div>
            <div className="flex space-x-6 mb-4 md:mb-0">
              <Link
                to="/"
                className="transition-colors"
                style={{ color: theme.colors.text }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = theme.colors.primary)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = theme.colors.text)
                }
              >
                Home
              </Link>
              <Link
                to="/about"
                className="transition-colors"
                style={{ color: theme.colors.text }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = theme.colors.primary)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = theme.colors.text)
                }
              >
                Acerca de
              </Link>
              <Link
                to="/contact"
                className="transition-colors"
                style={{ color: theme.colors.text }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = theme.colors.primary)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = theme.colors.text)
                }
              >
                Contacto
              </Link>
              <a
                href="https://github.com"
                className="flex items-center transition-colors"
                style={{ color: theme.colors.text }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = theme.colors.primary)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = theme.colors.text)
                }
              >
                <Github className="w-4 h-4 mr-1" />
                GitHub
              </a>
            </div>
            <div
              className="text-sm"
              style={{ color: theme.colors.secondaryText }}
            >
              © {new Date().getFullYear()} CodeBuddies. Todos los derechos
              reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
