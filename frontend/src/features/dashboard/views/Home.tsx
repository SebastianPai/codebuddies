"use client";

import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Trophy, Star, BookOpen, Zap, User } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import Navbar from "@/components/common/Navbar";
import { apiGet } from "@/api";

// Placeholder for authentication hook (replace with your auth logic)
import { useAuth } from "@/context/AuthContext"; // Adjust based on your setup

// Interfaces
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

interface Ranking {
  rank: number;
  name: string;
  xp: number;
  level: number;
  profilePicture: string;
}

// Mock course snippets for preview
const courseSnippets: { [key: string]: string } = {
  "JavaScript Avanzado":
    "const debounce = (fn, ms) => { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => fn(...args), ms); }; };",
  "React Masterclass": "const [state, setState] = useState(initialState);",
  "Fundamentos de Python":
    "def factorial(n): return 1 if n == 0 else n * factorial(n - 1)",
};

// Minigame code snippets
const codeSnippets = [
  "const sum = (a, b) => a + b;",
  "let x = 42;",
  "console.log('Hello, World!');",
];

export default function Home() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth(); // Authentication hook (returns user or null)

  // States for modules and courses
  const [modules, setModules] = useState<Module[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // States for rankings
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [rankingError, setRankingError] = useState("");

  // Minigame states
  const [gameState, setGameState] = useState<"idle" | "playing" | "finished">(
    "idle"
  );
  const [codeSnippet, setCodeSnippet] = useState("");
  const [userInput, setUserInput] = useState("");
  const [score, setScore] = useState(0);
  const [topScore, setTopScore] = useState(
    Number(localStorage.getItem("codeBlitzTopScore")) || 0
  );
  const [timeLeft, setTimeLeft] = useState(10);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(
    null
  );
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Minigame logic
  const startGame = () => {
    const randomSnippet =
      codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
    setCodeSnippet(randomSnippet);
    setUserInput("");
    setScore(0);
    setTimeLeft(10);
    setFeedback(null);
    setGameState("playing");

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setGameState("finished");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setUserInput(input);

    if (gameState === "playing" && input === codeSnippet) {
      clearInterval(timerRef.current!);
      const newScore = timeLeft * 10;
      setScore(newScore);
      setFeedback("correct");
      setGameState("finished");

      if (newScore > topScore) {
        setTopScore(newScore);
        localStorage.setItem("codeBlitzTopScore", newScore.toString());
      }
    } else if (input.length >= codeSnippet.length && input !== codeSnippet) {
      setFeedback("incorrect");
    }
  };

  const resetGame = () => {
    setGameState("idle");
    setUserInput("");
    setFeedback(null);
  };

  // Fetch modules and courses
  useEffect(() => {
    const fetchModulesAndCourses = async () => {
      try {
        setLoading(true);
        setError("");
        const modulesData = await apiGet<Module[]>("/api/modules");
        setModules(modulesData);
        if (modulesData.length > 0) {
          const firstModuleId = modulesData[0]._id;
          setSelectedModule(firstModuleId);
          const coursesData = await apiGet<Course[]>(
            `/api/modules/${firstModuleId}/courses`
          );
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

  // Fetch rankings
  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setRankingLoading(true);
        setRankingError("");
        const rankingsData = await apiGet<{ rankings: Ranking[] }>(
          `/api/rankings/public/weekly`
        );
        setRankings(rankingsData.rankings);
      } catch (err: any) {
        console.error("Error al cargar rankings:", err);
        setRankingError(err.message || "Error al cargar los rankings");
      } finally {
        setRankingLoading(false);
      }
    };

    fetchRankings();
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle module change
  const handleModuleChange = async (moduleId: string) => {
    try {
      setSelectedModule(moduleId);
      setLoading(true);
      setError("");
      const coursesData = await apiGet<Course[]>(
        `/api/modules/${moduleId}/courses`
      );
      setCourses(coursesData);
    } catch (err: any) {
      console.error("Error al cambiar módulo:", err);
      setError(err.message || "Error al cargar los cursos");
    } finally {
      setLoading(false);
    }
  };

  // Handle course click (for logged-in users)
  const handleCourseClick = (courseId: string) => {
    navigate(`/learn/course/${courseId}`);
  };

  // Get image URL
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return "/images/default-profile.jpg";
    if (imagePath.startsWith("http")) return imagePath;
    return `${import.meta.env.VITE_API_URL}${imagePath}`;
  };

  return (
    <div
      className="min-h-screen w-full font-jersey"
      style={{ background: theme.colors.background, color: theme.colors.text }}
    >
      <style>
        {`
          @keyframes typewriter {
            from { width: 0; }
            to { width: 100%; }
          }
          .typewriter {
            overflow: hidden;
            white-space: nowrap;
            animation: typewriter 1.5s steps(30) 1;
          }
          @keyframes progress {
            0% { width: 20%; }
            50% { width: 25%; }
            100% { width: 20%; }
          }
          .animate-progress {
            animation: progress 2s ease-in-out infinite;
          }
          @keyframes flash {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          .code-editor .code-line {
            line-height: 1.4;
            white-space: nowrap;
          }
          .code-editor:hover .code-line {
            background: ${theme.colors.accent}20;
          }
          @media (prefers-reduced-motion) {
            .typewriter {
              width: 100%;
              animation: none;
            }
            .animate-progress {
              animation: none;
              width: 20%;
            }
            .code-editor:hover .code-line {
              background: none;
            }
          }
          @media (max-width: 640px) {
            .text-5xl { font-size: 2.5rem; }
            .text-4xl { font-size: 2rem; }
            .text-3xl { font-size: 1.75rem; }
            .text-2xl { font-size: 1.5rem; }
            .text-xl { font-size: 1.25rem; }
            .text-lg { font-size: 1rem; }
            .text-base { font-size: 0.875rem; }
            .text-xs { font-size: 0.65rem; }
            .px-6 { padding-left: 1rem; padding-right: 1rem; }
            .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
            .minigame-input { font-size: 0.875rem; }
            .ranking-grid { grid-template-columns: 1fr; }
            .code-editor { font-size: 0.65rem; height: 9rem; }
          }
        `}
      </style>

      <Navbar />

      {/* Hero Section */}
      <section
        className="relative w-full py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center min-h-[50vh]"
        style={{
          background: `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.accent}20 100%)`,
        }}
      >
        <div className="relative z-10 w-full max-w-full mx-4">
          <h1
            className="text-base md:text-4xl font-bold mb-4 typewriter text-center"
            style={{ color: theme.colors.text }}
          >
            ¡Aprende en una Aventura epica!
          </h1>
          <p
            className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-center"
            style={{ color: theme.colors.secondaryText }}
          >
            ¡Únete a más de 10,000 CodeBuddies, completa misiones, gana XP y
            domina la programación!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link
              to="/register"
              className="px-8 py-4 text-lg font-medium rounded-lg transition-transform hover:scale-105"
              style={{
                background: `linear-gradient(90deg, ${theme.colors.accent} 0%, ${theme.colors.accenttwo} 100%)`,
                color: theme.colors.buttonText,
                border: `2px solid ${theme.colors.border}`,
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
              }}
            >
              ¡Regístrate y Gana 199 XP Extra!
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 text-lg font-medium rounded-lg transition-transform hover:scale-105"
              style={{
                background: "transparent",
                color: theme.colors.text,
                border: `2px solid ${theme.colors.accent}`,
              }}
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </section>

      {/* Progress Preview with Top 3 Rankings */}
      <section
        className="py-12 px-4 sm:px-6 lg:px-8"
        style={{ background: theme.colors.background }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="text-3xl font-bold mb-8"
            style={{ color: theme.colors.text }}
          >
            ¡Tu Viaje de Código Te Espera!
          </h2>
          <div
            className="p-6 rounded-xl transition-transform hover:scale-105 mb-8"
            style={{
              background: theme.colors.card,
              border: `4px solid ${theme.colors.border}`,
              boxShadow: "0 8px 20px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
              <div
                className="relative w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: theme.colors.accent,
                  border: `2px solid ${theme.colors.primary}`,
                  boxShadow: `0 0 10px ${theme.colors.accent}`,
                }}
              >
                <User
                  className="w-10 h-10"
                  style={{ color: theme.colors.buttonText }}
                />
                <div
                  className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: theme.colors.primary,
                    color: theme.colors.buttonText,
                  }}
                >
                  #1
                </div>
              </div>
              <div className="text-left">
                <h3
                  className="font-bold text-xl mb-2"
                  style={{ color: theme.colors.text }}
                >
                  Futuro CodeBuddy
                </h3>
                <p
                  className="text-md"
                  style={{ color: theme.colors.secondaryText }}
                >
                  Nivel 1 - Novato del Código
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Trophy
                    className="w-4 h-4"
                    style={{ color: theme.colors.accent }}
                  />
                  <span style={{ color: theme.colors.text }}>3 Insignias</span>
                </div>
              </div>
            </div>
            <div
              className="w-full h-6 rounded-full mb-4 overflow-hidden"
              style={{ background: theme.colors.background }}
            >
              <div
                className="h-full rounded-full animate-progress"
                style={{
                  width: "20%",
                  background: `linear-gradient(90deg, ${theme.colors.accent} 0%, ${theme.colors.primary} 100%)`,
                }}
              />
            </div>
            <p
              className="text-sm mb-4"
              style={{ color: theme.colors.secondaryText }}
            >
              200 XP / 1000 XP para Nivel 2
            </p>
            <p className="text-md mb-6" style={{ color: theme.colors.text }}>
              ¡Regístrate para desbloquear tu perfil, competir en el ranking y
              ganar recompensas exclusivas!
            </p>
            <Link
              to="/register"
              className="px-6 py-3 rounded-lg font-medium transition-transform hover:scale-105"
              style={{
                background: theme.colors.accenttwo,
                color: theme.colors.buttonText,
                border: `2px solid ${theme.colors.border}`,
              }}
            >
              Comienza Tu Aventura
            </Link>
          </div>

          {/* Top 3 Rankings Widget */}
          <div className="mt-8">
            <h3
              className="text-2xl font-bold mb-6"
              style={{ color: theme.colors.text }}
            >
              Top 3 Coders
            </h3>
            {rankingError && (
              <p
                className="text-center mb-6"
                style={{ color: theme.colors.error }}
              >
                {rankingError}
              </p>
            )}
            {rankingLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 ranking-grid">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg h-32 animate-pulse"
                    style={{ background: theme.colors.card }}
                  ></div>
                ))}
              </div>
            ) : rankings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 ranking-grid">
                {rankings.slice(0, 3).map((user, index) => {
                  const positionStyles = [
                    {
                      background:
                        "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                      border: "2px solid #FFD700",
                    }, // Oro
                    {
                      background:
                        "linear-gradient(135deg, #C0C0C0 0%, #A9A9A9 100%)",
                      border: "2px solid #C0C0C0",
                    }, // Plata
                    {
                      background:
                        "linear-gradient(135deg, #CD7F32 0%, #A0522D 100%)",
                      border: "2px solid #CD7F32",
                    }, // Bronce
                  ];
                  return (
                    <div
                      key={user.rank}
                      className="p-4 rounded-lg transition-transform hover:scale-105"
                      style={{
                        background: theme.colors.card,
                        border: `2px solid ${theme.colors.border}`,
                        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-full relative"
                          style={{
                            padding: "2px",
                            background: positionStyles[index].background,
                            border: positionStyles[index].border,
                          }}
                        >
                          {user.profilePicture ? (
                            <img
                              src={getImageUrl(user.profilePicture)}
                              alt={user.name}
                              className="w-full h-full rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src =
                                  "/images/default-profile.jpg";
                              }}
                            />
                          ) : (
                            <User
                              className="w-full h-full p-1 rounded-full"
                              style={{ color: theme.colors.accent }}
                            />
                          )}
                          <div
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{
                              background: positionStyles[index].background,
                              color: theme.colors.buttonText,
                            }}
                          >
                            #{user.rank}
                          </div>
                        </div>
                        <div>
                          <p
                            className="font-bold text-sm"
                            style={{ color: theme.colors.text }}
                          >
                            {user.name}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: theme.colors.secondaryText }}
                          >
                            {user.xp.toLocaleString()} XP
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p
                className="text-center"
                style={{ color: theme.colors.secondaryText }}
              >
                No hay rankings disponibles.
              </p>
            )}
            <div className="mt-6">
              <Link
                to="/register"
                className="px-6 py-3 rounded-lg font-medium inline-flex items-center transition-transform hover:scale-105"
                style={{
                  background: theme.colors.accent,
                  color: theme.colors.buttonText,
                  border: `2px solid ${theme.colors.border}`,
                }}
              >
                ¡Únete al Ranking!
                <ChevronRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Minigame Section: CodeBlitz */}
      <section
        className="py-12 px-4 sm:px-6 lg:px-8"
        style={{
          background: theme.colors.card,
          borderTop: `1px solid ${theme.colors.border}`,
          borderBottom: `1px solid ${theme.colors.border}`,
        }}
      >
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-3xl font-bold mb-8 text-center"
            style={{ color: theme.colors.text }}
          >
            CodeBlitz: ¡Prueba Tu Velocidad!
          </h2>
          <div
            className="p-6 rounded-xl"
            style={{
              background: theme.colors.background,
              border: `4px solid ${theme.colors.border}`,
              boxShadow: "0 8px 20px rgba(0, 0, 0, 0.1)",
            }}
          >
            <p
              className="text-md mb-6 text-center"
              style={{ color: theme.colors.secondaryText }}
            >
              ¡Escribe el código lo más rápido que puedas para ganar puntos!
            </p>
            <div
              className="p-4 rounded-lg mb-6 font-mono text-sm"
              style={{
                background: theme.colors.card,
                border: `2px solid ${theme.colors.accent}`,
                color: theme.colors.text,
              }}
            >
              {codeSnippet || "Presiona 'Jugar' para empezar"}
            </div>
            <div className="flex flex-col items-center mb-6">
              <input
                type="text"
                value={userInput}
                onChange={handleInputChange}
                disabled={gameState !== "playing"}
                className="w-full max-w-md p-3 rounded-lg font-mono text-sm minigame-input"
                style={{
                  background: theme.colors.card,
                  border: `2px solid ${
                    feedback === "correct"
                      ? theme.colors.success
                      : feedback === "incorrect"
                      ? theme.colors.error
                      : theme.colors.border
                  }`,
                  color: theme.colors.text,
                  boxShadow: feedback
                    ? `0 0 8px ${
                        feedback === "correct"
                          ? theme.colors.success
                          : theme.colors.error
                      }`
                    : "none",
                }}
                placeholder="Escribe el código aquí..."
              />
              <div className="flex justify-between w-full max-w-md mt-4">
                <div className="flex items-center">
                  <Star
                    className="w-4 h-4 mr-2"
                    style={{ color: theme.colors.accent }}
                  />
                  <span style={{ color: theme.colors.text }}>
                    Puntuación: {score}
                  </span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={theme.colors.accent}
                      strokeWidth="2"
                      strokeDasharray={`${(timeLeft / 10) * 100}, 100`}
                    />
                    <text
                      x="18"
                      y="22"
                      textAnchor="middle"
                      fill={theme.colors.text}
                      fontSize="10"
                    >
                      {timeLeft}
                    </text>
                  </svg>
                  <span style={{ color: theme.colors.text }}>Tiempo</span>
                </div>
              </div>
              {topScore > 0 && (
                <div
                  className="mt-4 text-sm"
                  style={{ color: theme.colors.secondaryText }}
                >
                  Mejor Puntuación: {topScore}
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {gameState === "idle" || gameState === "finished" ? (
                <button
                  onClick={startGame}
                  className="px-6 py-3 rounded-lg font-medium flex items-center transition-transform hover:scale-105"
                  style={{
                    background: theme.colors.accent,
                    color: theme.colors.buttonText,
                    border: `2px solid ${theme.colors.border}`,
                  }}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {gameState === "idle" ? "Jugar" : "Jugar de Nuevo"}
                </button>
              ) : (
                <button
                  onClick={resetGame}
                  className="px-6 py-3 rounded-lg font-medium flex items-center transition-transform hover:scale-105"
                  style={{
                    background: theme.colors.error,
                    color: theme.colors.buttonText,
                    border: `2px solid ${theme.colors.border}`,
                  }}
                >
                  Reiniciar
                </button>
              )}
              <Link
                to="/register"
                className="px-6 py-3 rounded-lg font-medium flex items-center transition-transform hover:scale-105"
                style={{
                  background: theme.colors.accenttwo,
                  color: theme.colors.buttonText,
                  border: `2px solid ${theme.colors.border}`,
                }}
              >
                ¡Guarda tu Puntuación!
                <ChevronRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
            {feedback && (
              <p
                className="text-center mt-4 text-md animate-pulse"
                style={{
                  color:
                    feedback === "correct"
                      ? theme.colors.success
                      : theme.colors.error,
                }}
              >
                {feedback === "correct" ? "¡Correcto! 🎉" : "Incorrecto 😔"}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section
        className="py-12 px-4 sm:px-6 lg:px-8"
        style={{ background: theme.colors.background }}
      >
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-3xl font-bold mb-8 text-center"
            style={{ color: theme.colors.text }}
          >
            ¡Comienza a Aprender Hoy!
          </h2>
          {error && (
            <p
              className="text-center mb-8"
              style={{ color: theme.colors.error }}
            >
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {modules.map((mod) => (
              <button
                key={mod._id}
                onClick={() => handleModuleChange(mod._id)}
                className="px-4 py-2 rounded-lg font-medium transition-all"
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
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl h-64 animate-pulse"
                  style={{ background: theme.colors.card }}
                ></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
              {courses.length > 0 ? (
                courses.slice(0, 3).map((course) => (
                  <div
                    key={course._id}
                    className="rounded-xl overflow-hidden transition-transform hover:scale-105 group relative"
                    style={{
                      background: theme.colors.card,
                      border: `4px solid ${theme.colors.border}`,
                      boxShadow: "0 8px 20px rgba(0, 0, 0, 0.1)",
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
                          background: theme.colors.accent,
                          color: theme.colors.buttonText,
                        }}
                      >
                        {course.level}
                      </div>
                    </div>
                    <div className="p-6">
                      <h3
                        className="font-bold text-xl mb-4"
                        style={{ color: theme.colors.text }}
                      >
                        {course.title}
                      </h3>
                      {user ? (
                        <button
                          onClick={() => handleCourseClick(course._id)}
                          className="w-full px-8 py-4 text-lg font-medium rounded-lg transition-transform hover:scale-105"
                          style={{
                            background: `linear-gradient(90deg, ${theme.colors.accent} 0%, ${theme.colors.accenttwo} 100%)`,
                            color: theme.colors.buttonText,
                            border: `2px solid ${theme.colors.border}`,
                            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
                          }}
                        >
                          Empezar Curso
                        </button>
                      ) : (
                        <Link
                          to="/register"
                          className="w-full px-8 py-4 text-lg font-medium rounded-lg transition-transform hover:scale-105"
                          style={{
                            background: `linear-gradient(90deg, ${theme.colors.accent} 0%, ${theme.colors.accenttwo} 100%)`,
                            color: theme.colors.buttonText,
                            border: `2px solid ${theme.colors.border}`,
                            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
                          }}
                        >
                          Únete para Empezar
                        </Link>
                      )}
                    </div>
                    {courseSnippets[course.title] && (
                      <div
                        className="absolute inset-0 hidden group-hover:flex items-center justify-center p-6 bg-opacity-90 font-mono text-sm typewriter"
                        style={{
                          background: theme.colors.background,
                          border: `2px solid ${theme.colors.accent}`,
                          color: theme.colors.text,
                        }}
                      >
                        <code>{courseSnippets[course.title]}</code>
                      </div>
                    )}
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
          )}
          <div className="text-center">
            <Link
              to="/learn"
              className="px-6 py-3 rounded-lg font-medium inline-flex items-center transition-transform hover:scale-105"
              style={{
                background: theme.colors.accent,
                color: theme.colors.buttonText,
                border: `2px solid ${theme.colors.border}`,
              }}
            >
              Explorar Todos los Cursos
              <ChevronRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
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
    </div>
  );
}
