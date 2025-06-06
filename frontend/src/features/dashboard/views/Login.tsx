// frontend/src/pages/Login.tsx

"use client";

import { useState, FormEvent, JSX } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import Navbar from "../../../components/common/Navbar";

interface ThemeColors {
  background: string;
  text: string;
  card: string;
  border: string;
  accent: string;
  secondaryText: string;
  button: string;
  buttonText: string;
  error: string;
  success: string;
}

interface ThemeContext {
  theme: { colors: ThemeColors };
}

export default function Login(): JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme() as ThemeContext;

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
      // No necesitas navigate("/dashboard") aquí porque AuthContext.tsx ya lo hace
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Credenciales inválidas");
    }
  };

  return (
    <div
      className="flex flex-col min-h-screen font-mono"
      style={{ background: theme.colors.background, color: theme.colors.text }}
    >
      <Navbar />
      <div className="flex justify-center items-center flex-grow p-4">
        <div
          className="w-full max-w-md rounded-xl p-8 shadow-lg"
          style={{
            background: theme.colors.card,
            border: `4px solid ${theme.colors.border}`,
          }}
        >
          <div className="text-center mb-6">
            <div
              className="text-4xl font-mono mb-2"
              style={{ color: theme.colors.accent }}
            >
              {["C", "o", "d", "e", "B", "u", "d", "d", "i", "e", "s"].map(
                (letter, index) => (
                  <span
                    key={index}
                    className="inline-block transform hover:scale-110 transition-transform duration-300"
                  >
                    {letter}
                  </span>
                )
              )}
            </div>
            <h1 className="text-3xl font-bold mb-2">Inicia Sesión</h1>
            <p style={{ color: theme.colors.secondaryText }}>
              ¡Continúa tu aventura de código!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="p-2 rounded text-center"
                style={{
                  background: theme.colors.error,
                  color: theme.colors.buttonText,
                }}
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block mb-2"
                style={{ color: theme.colors.text }}
              >
                Email o Usuario
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md p-3 placeholder:text-[#9ca3af] focus:outline-none focus:scale-[1.02] transition-all duration-300"
                style={{
                  background: theme.colors.background,
                  border: `2px solid ${theme.colors.border}`,
                  color: theme.colors.text,
                }}
                placeholder="tu@email.com"
                required
                onFocus={(e) =>
                  (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                }
                onBlur={(e) =>
                  (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                }
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block mb-2"
                style={{ color: theme.colors.text }}
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md p-3 placeholder:text-[#9ca3af] focus:outline-none focus:scale-[1.02] transition-all duration-300"
                style={{
                  background: theme.colors.background,
                  border: `2px solid ${theme.colors.border}`,
                  color: theme.colors.text,
                }}
                placeholder="••••••••"
                required
                onFocus={(e) =>
                  (e.currentTarget.style.border = `2px solid ${theme.colors.accent}`)
                }
                onBlur={(e) =>
                  (e.currentTarget.style.border = `2px solid ${theme.colors.border}`)
                }
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 rounded-md font-bold hover:scale-105 transition-transform duration-300"
                style={{
                  background: theme.colors.button,
                  color: theme.colors.buttonText,
                }}
                aria-label="Iniciar sesión"
              >
                INICIAR SESIÓN
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p style={{ color: theme.colors.secondaryText }}>
              ¿No tienes una cuenta?{" "}
              <Link
                to="/register"
                className="hover:underline"
                style={{ color: theme.colors.accent }}
              >
                Regístrate
              </Link>
            </p>
          </div>

          <div
            className="mt-4 p-3 rounded-md"
            style={{ background: theme.colors.card }}
          >
            <p
              className="text-xs"
              style={{ color: theme.colors.secondaryText }}
            >
              <span style={{ color: theme.colors.success }}>// </span>
              Tip: Completa misiones diarias para ganar XP y subir de nivel
            </p>
          </div>
        </div>
      </div>
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
