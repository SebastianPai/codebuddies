"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Code, ChevronRight, X } from "lucide-react";
import { toast } from "react-toastify";
import Navbar from "@/components/common/Navbar";
import { apiGet } from "@/api";

// Interfaces
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
  snippet?: string;
}

interface ModuleWithCourses extends Module {
  courses: Course[];
}

interface ThemeColors {
  background: string;
  text: string;
  card: string;
  border: string;
  accent: string;
  accenttwo: string;
  primary: string;
  secondaryText: string;
  button: string;
  buttonText: string;
  success: string;
  error: string;
}

// Componente Principal
export default function Learn() {
  const { theme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState<ModuleWithCourses[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasSeenWelcome, setHasSeenWelcome] = useState(
    localStorage.getItem("hasSeenWelcome") === "true"
  );
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  // Fondos dinámicos por tema
  const getBackgroundImage = () => {
    switch (theme.name) {
      case "dark":
        return "/images/fondo-dark-code.jpg";
      case "light":
        return "/images/fondo-light-matrix.jpg";
      case "pink":
        return "/images/fondo-pink-cyber.jpg";
      default:
        return "/images/fondo-epic-code.jpg";
    }
  };

  // Obtener URL de imagen
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return "/images/default-course.jpg";
    if (imagePath.startsWith("http")) return imagePath;
    return `${
      import.meta.env.VITE_API_URL ||
      "https://codebuddies-jh-3e772884b367.herokuapp.com"
    }${imagePath}`;
  };

  // Fetch de datos
  useEffect(() => {
    const fetchModulesAndCourses = async () => {
      try {
        setLoading(true);
        setError("");

        const modulesData: Module[] = await apiGet<Module[]>("/api/modules");
        const modulesWithCourses: ModuleWithCourses[] = await Promise.all(
          modulesData.map(async (mod) => {
            const coursesData: Course[] = await apiGet<Course[]>(
              `/api/modules/${mod._id}/courses`
            );
            return {
              ...mod,
              courses: coursesData.map((course) => ({
                ...course,
                snippet: generateSnippet(course.title),
              })),
            };
          })
        );

        setModules(modulesWithCourses);
      } catch (err: any) {
        console.error("Error fetching modules and courses:", err);
        setError(err.message || "Error al cargar los cursos");
        toast.error(err.message || "Error al cargar los cursos", {
          style: {
            background: theme.colors.card,
            color: theme.colors.text,
            border: `2px solid ${theme.colors.error}`,
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchModulesAndCourses();
  }, [theme]);

  // Generar snippets de código
  const generateSnippet = (title: string) => {
    const snippets: { [key: string]: string } = {
      JavaScript: "const epic = '¡Código!';",
      Python: "print('¡Aventura!')",
      React: "const App = () => <h1>¡Épico!</h1>;",
      HTML: "<div>¡Aventura!</div>",
    };
    return snippets[title.split(" ")[0]] || "console.log('¡Código épico!');";
  };

  // Manejo de clics en cursos
  const handleCourseClick = (courseId: string) => {
    if (!user) {
      navigate("/login", { state: { fromCourse: true } });
      toast.info("¡Inicia sesión para desatar tu código!", {
        position: "top-right",
        autoClose: 3000,
        style: {
          background: theme.colors.card,
          color: theme.colors.text,
          border: `2px solid ${theme.colors.accent}`,
        },
      });
      return;
    }
    navigate(`/learn/course/${courseId}`);
    toast.success("¡Tu código comienza a brillar!", {
      position: "top-right",
      autoClose: 2000,
      style: {
        background: theme.colors.card,
        color: theme.colors.text,
        border: `2px solid ${theme.colors.accent}`,
      },
    });
  };

  // Color por nivel de dificultad
  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "principiante":
        return theme.colors.success;
      case "intermedio":
        return theme.colors.accent;
      case "avanzado":
        return theme.colors.error;
      default:
        return theme.colors.accent;
    }
  };

  // Cerrar bienvenida
  const handleCloseWelcome = () => {
    setHasSeenWelcome(true);
    localStorage.setItem("hasSeenWelcome", "true");
  };

  // Cierre automático de la bienvenida tras 5 segundos
  useEffect(() => {
    if (user && !hasSeenWelcome) {
      const timer = setTimeout(() => {
        setHasSeenWelcome(true);
        localStorage.setItem("hasSeenWelcome", "true");
        toast.info("¡Explora los cursos y comienza tu aventura!", {
          style: {
            background: theme.colors.card,
            color: theme.colors.text,
            border: `2px solid ${theme.colors.accent}`,
          },
        });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [user, hasSeenWelcome]);

  // Interacción con el editor
  const handleEditorInteraction = () => {
    setIsConsoleOpen(true);
    setTimeout(() => setIsConsoleOpen(false), 2000);
  };

  // Spinner de carga
  if (authLoading) {
    return (
      <div
        className="flex justify-center items-center min-h-screen"
        style={{ background: theme.colors.background }}
      >
        <div
          className="animate-spin rounded-lg h-12 w-12 border-4"
          style={{
            borderTopColor: theme.colors.accent,
            borderRightColor: theme.colors.accent,
            borderBottomColor: "transparent",
            borderLeftColor: "transparent",
          }}
        ></div>
      </div>
    );
  }

  return (
    <main
      className="font-jersey min-h-screen relative"
      style={{
        background: theme.colors.background,
        color: theme.colors.text,
        backgroundImage: `url(${getBackgroundImage()})`,
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      }}
    >
      <style>
        {`
          @keyframes spark {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(25px, -25px) scale(0); opacity: 0; }
          }
          .spark-button::after {
            content: '';
            position: absolute;
            width: 12px;
            height: 12px;
            background: ${theme.colors.accent};
            border-radius: 50%;
            opacity: 0;
            pointer-events: none;
          }
          .spark-button:active::after {
            animation: spark 0.5s ease-out;
          }
          @keyframes rotate-icon {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .rotate-icon {
            transition: transform 0.5s ease;
          }
          .spark-button:hover .rotate-icon {
            transform: rotate(360deg);
          }
          @keyframes typewriter {
            from { width: 0; }
            to { width: 100%; }
          }
          .typewriter {
            overflow: hidden;
            white-space: nowrap;
            animation: typewriter 2s steps(30) 1;
          }
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .fade-in {
            animation: fade-in 1.5s ease-in;
          }
          @keyframes typewriter-snippet {
            from { width: 0; }
            to { width: 100%; }
          }
          .typewriter-snippet {
            overflow: hidden;
            white-space: nowrap;
            animation: typewriter-snippet 1s steps(20) 1;
          }
          @keyframes float {
            0% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
            100% { transform: translateY(0); }
          }
          .mascot-float {
            animation: float 3s ease-in-out infinite;
          }
          .course-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          .course-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
          }
          @keyframes flash {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          .console-output {
            animation: flash 0.5s ease-in-out;
          }
          .mascot-container {
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            padding: 8px;
          }
          .mascot-image {
            width: 100%;
            height: 100%;
            object-fit: contain;
            object-position: center;
          }
          .tooltip {
            visibility: hidden;
            opacity: 0;
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: ${theme.colors.card};
            color: ${theme.colors.text};
            padding: 8px 12px;
            border-radius: 8px;
            border: 2px solid ${theme.colors.accent};
            font-size: 0.75rem;
            white-space: nowrap;
            transition: opacity 0.3s ease, visibility 0.3s ease;
            z-index: 10;
          }
          .mascot-container:hover .tooltip {
            visibility: visible;
            opacity: 1;
          }
          .linkedin-link:hover {
            color: ${theme.colors.accent};
            text-decoration: underline;
          }
          footer {
            border-top: 2px solid ${theme.colors.border};
          }
          .code-editor {
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
          }
          .close-button {
            transition: transform 0.3s ease, color 0.3s ease;
          }
          .close-button:hover {
            transform: scale(1.2);
            color: ${theme.colors.accent};
          }
          @media (prefers-reduced-motion) {
            .spark-button::after, .rotate-icon, .typewriter, .typewriter-snippet, .mascot-float, .fade-in, .console-output {
              animation: none;
              transition: none;
            }
            .typewriter, .typewriter-snippet {
              width: 100%;
            }
            .course-card:hover {
              transform: none;
            }
          }
          @media (max-width: 640px) {
            .typewriter {
              white-space: normal;
              overflow-wrap: break-word;
              animation: fade-in 1s ease-in;
            }
            .text-5xl { font-size: 2rem; }
            .text-4xl { font-size: 1.75rem; }
            .text-3xl { font-size: 1.5rem; }
            .text-2xl { font-size: 1.25rem; }
            .text-xl { font-size: 1rem; }
            .text-lg { font-size: 0.875rem; }
            .text-xs { font-size: 0.65rem; }
            .px-10 { padding-left: 1.5rem; padding-right: 1.5rem; }
            .py-5 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
            .code-editor { font-size: 0.65rem; height: 8rem; }
            .console-output { font-size: 0.6rem; padding: 0.5rem; }
            .mascot-container { width: 80px; height: 80px; padding: 6px; }
            .tooltip { font-size: 0.65rem; padding: 6px 10px; }
          }
          @media (min-width: 641px) {
            .mascot-container { width: 120px; height: 120px; padding: 10px; }
          }
        `}
      </style>

      <Navbar />

      {/* Sección Hero para Usuarios No Autenticados o que Ya Vieron la Bienvenida */}
      {(!user || hasSeenWelcome) && (
        <section
          className="relative w-full py-16 px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between min-h-[60vh]"
          style={{
            background: `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.accent}20 100%)`,
          }}
        >
          <div className="relative z-10 w-full md:w-3/5 max-w-2xl mx-4">
            <h1
              className="text-3xl md:text-4xl font-bold mb-6 typewriter md:fade-in"
              style={{ color: theme.colors.text }}
            >
              ¡Codea tu Aventura Épica!
            </h1>
            <p
              className="text-lg mb-8"
              style={{ color: theme.colors.secondaryText }}
            >
              Aprende a programar con cursos interactivos y retos que te
              llevarán al siguiente nivel.
            </p>
            <div
              className="code-editor relative w-full h-40 rounded-xl overflow-x-auto cursor-pointer font-mono text-xs"
              style={{
                background: theme.colors.card,
                border: `2px solid ${theme.colors.accent}`,
                color: theme.colors.text,
              }}
              onTouchStart={handleEditorInteraction}
              onClick={handleEditorInteraction}
            >
              <div className="p-4 h-full flex flex-col justify-between">
                <div>
                  <span
                    className="code-line block typewriter"
                    style={{ color: theme.colors.accent }}
                  >
                    function codeAdventure() {"{"}
                  </span>
                  <span
                    className="code-line block ml-4 typewriter"
                    style={{ animationDelay: "0.3s", color: theme.colors.text }}
                  >
                    const skills = ['JS', 'Python', 'React'];
                  </span>
                  <span
                    className="code-line block ml-4 typewriter"
                    style={{ animationDelay: "0.6s", color: theme.colors.text }}
                  >
                    let mission ={" "}
                    <span style={{ color: theme.colors.success }}>
                      '¡Domina el código!'
                    </span>
                    ;
                  </span>
                  <span
                    className="code-line block ml-4 typewriter"
                    style={{
                      animationDelay: "0.9s",
                      color: theme.colors.accent,
                    }}
                  >
                    console.log(mission);
                  </span>
                  <span
                    className="code-line block typewriter"
                    style={{
                      animationDelay: "1.2s",
                      color: theme.colors.accent,
                    }}
                  >
                    {"}"}
                  </span>
                </div>
                {isConsoleOpen && (
                  <div
                    className="console-output absolute bottom-0 left-0 right-0 bg-opacity-80 p-2 text-xs"
                    style={{
                      background: theme.colors.background,
                      color: theme.colors.success,
                      borderTop: `1px solid ${theme.colors.accent}`,
                    }}
                  >
                    ¡Domina el código!
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="relative w-full md:w-1/4 mt-8 md:mt-0">
            <div
              className="mascot-container rounded-full mx-auto relative"
              style={{ border: `3px solid ${theme.colors.accent}` }}
            >
              <img
                src="/images/bitzi2.png"
                alt="Bitzi Mascot"
                className="mascot-image mascot-float"
                onError={(e) => {
                  e.currentTarget.src = "/images/default-bitzi.jpg";
                }}
              />
              <span className="tooltip">¡Bitzi está listo para codear!</span>
            </div>
          </div>
        </section>
      )}

      {/* Sección de Bienvenida para Usuarios Autenticados (Primera Vez) */}
      {user && !hasSeenWelcome && (
        <section
          className="relative w-full py-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center min-h-[60vh]"
          style={{
            background: `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.accent}30 100%)`,
          }}
        >
          <div className="relative z-10 w-full max-w-3xl mx-4 text-center">
            <button
              onClick={handleCloseWelcome}
              className="absolute top-4 right-4 close-button"
              style={{ color: theme.colors.text }}
              aria-label="Cerrar bienvenida"
            >
              <X className="w-6 h-6" />
            </button>
            <div
              className="mascot-container rounded-full mx-auto mb-6 relative"
              style={{ border: `3px solid ${theme.colors.accent}` }}
            >
              <img
                src="/images/bitzi2.png"
                alt="Bitzi Mascot"
                className="mascot-image mascot-float"
                onError={(e) => {
                  e.currentTarget.src = "/images/default-bitzi.jpg";
                }}
              />
              <span className="tooltip">¡Bitzi está listo para codear!</span>
            </div>
            <h1
              className="text-2xl md:text-4xl font-bold mb-6 typewriter md:fade-in"
              style={{ color: theme.colors.text }}
            >
              ¡Bitzi te saluda, {user.name}!
            </h1>
            <p
              className="text-lg md:text-xl mb-8 max-w-xl mx-auto"
              style={{ color: theme.colors.secondaryText }}
            >
              ¡Bienvenido a CodeBuddies! Explora nuestros cursos y comienza tu
              aventura para dominar la programación.
            </p>
          </div>
        </section>
      )}

      {/* Sección de Cursos */}
      <section
        className="py-16 px-4 sm:px-6 lg:px-8"
        style={{ background: theme.colors.background }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <h2
              className="text-3xl md:text-4xl font-bold"
              style={{ color: theme.colors.text }}
            >
              Explora Nuestros Cursos
            </h2>
            <div className="flex items-center">
              <Code
                className="w-6 h-6 mr-2"
                style={{ color: theme.colors.accent }}
              />
              <span style={{ color: theme.colors.secondaryText }}>
                Actualizado semanalmente
              </span>
            </div>
          </div>
          {error && (
            <p
              className="text-center mb-8"
              style={{ color: theme.colors.error }}
            >
              {error}
            </p>
          )}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl h-80 animate-pulse"
                  style={{ background: theme.colors.card }}
                ></div>
              ))}
            </div>
          ) : modules.length === 0 ? (
            <p
              className="text-center text-lg"
              style={{ color: theme.colors.secondaryText }}
            >
              ¡Ups! No hay cursos disponibles ahora. ¡Vuelve pronto!
            </p>
          ) : (
            modules.map((mod) => (
              <div key={mod._id} className="mb-16">
                <h3
                  className="text-2xl md:text-3xl font-bold mb-8 text-center"
                  style={{ color: theme.colors.text }}
                >
                  {mod.title}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {mod.courses.map((course) => (
                    <div
                      key={course._id}
                      className="course-card rounded-xl overflow-hidden group"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                      }}
                    >
                      <div className="relative h-48">
                        <img
                          src={getImageUrl(course.image)}
                          alt={course.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/images/default-course.jpg";
                          }}
                        />
                        <div
                          className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium"
                          style={{
                            background: getDifficultyColor(course.level),
                            color: theme.colors.buttonText,
                          }}
                        >
                          {course.level}
                        </div>
                        {course.snippet && (
                          <div
                            className="absolute top-0 left-0 right-0 h-48 hidden group-hover:flex items-center justify-center p-4 bg-opacity-80 font-mono text-xs"
                            style={{
                              background: theme.colors.background,
                              color: theme.colors.text,
                            }}
                          >
                            <code className="p-2 rounded-lg bg-opacity-70 typewriter-snippet">
                              {course.snippet}
                            </code>
                          </div>
                        )}
                      </div>
                      <div className="p-6">
                        <h4
                          className="font-bold text-xl mb-3"
                          style={{ color: theme.colors.text }}
                        >
                          {course.title}
                        </h4>
                        <p
                          className="text-sm mb-4 line-clamp-2"
                          style={{ color: theme.colors.secondaryText }}
                        >
                          {course.description}
                        </p>
                        <button
                          onClick={() => handleCourseClick(course._id)}
                          className="w-full py-3 rounded-xl font-bold spark-button text-base relative"
                          style={{
                            background: `linear-gradient(90deg, ${theme.colors.accent} 0%, ${theme.colors.accenttwo} 100%)`,
                            color: theme.colors.buttonText,
                            border: `2px solid ${theme.colors.border}`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              theme.colors.accenttwo;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = `linear-gradient(90deg, ${theme.colors.accent} 0%, ${theme.colors.accenttwo} 100%)`;
                          }}
                        >
                          <span className="relative z-10">
                            {user ? "¡Empezar!" : "¡Únete!"}
                          </span>
                          <ChevronRight className="ml-2 w-5 h-5 inline rotate-icon" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Footer Personalizado */}
      <footer
        className="py-8 px-4 sm:px-6 lg:px-8 text-center"
        style={{ background: theme.colors.card, color: theme.colors.text }}
      >
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <img
            src="/images/bitzi2.png"
            alt="Bitzi Footer"
            className="w-10 h-10 mb-4 rounded-full object-contain"
            style={{ border: `2px solid ${theme.colors.accent}` }}
            onError={(e) => {
              e.currentTarget.src = "/images/default-bitzi.jpg";
            }}
          />
          <p
            className="text-sm md:text-base mb-2"
            style={{ color: theme.colors.text }}
          >
            Creado con pasión por Jhon Sebastian Pai
            <a
              href="https://www.linkedin.com/in/sebastian-pai"
              target="_blank"
              rel="noopener noreferrer"
              className="linkedin-link ml-1"
              style={{ color: theme.colors.accent }}
            >
              Conéctate
            </a>
          </p>
          <p
            className="text-xs md:text-sm"
            style={{ color: theme.colors.secondaryText }}
          >
            © 2025 CodeBuddies. ¡Hecho para inspirar programadores!
          </p>
        </div>
      </footer>
    </main>
  );
}
