"use client";

import { useState, ChangeEvent, FormEvent, JSX } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import Navbar from "../components/Navbar";

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string; // Added for the confirm password field
}

export default function Register(): JSX.Element {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [form, setForm] = useState<RegisterForm>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string>("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    // Validate password match
    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al registrarse");

      navigate("/login");
    } catch (err: any) {
      setError(err.message || "Error en el registro");
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
            <h1 className="text-3xl font-bold mb-2">Regístrate</h1>
            <p style={{ color: theme.colors.secondaryText }}>
              ¡Comienza tu aventura de programación!
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
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
                htmlFor="name"
                className="block mb-2"
                style={{ color: theme.colors.text }}
              >
                Nombre de Usuario
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full rounded-md p-3 placeholder:text-[#9ca3af] focus:outline-none focus:scale-[1.02] transition-all duration-300"
                style={{
                  background: theme.colors.background,
                  border: `2px solid ${theme.colors.border}`,
                  color: theme.colors.text,
                }}
                placeholder="CoderHero42"
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
                htmlFor="email"
                className="block mb-2"
                style={{ color: theme.colors.text }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
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
                name="password"
                value={form.password}
                onChange={handleChange}
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

            <div>
              <label
                htmlFor="confirmPassword"
                className="block mb-2"
                style={{ color: theme.colors.text }}
              >
                Confirmar Contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
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
              >
                CREAR CUENTA
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p style={{ color: theme.colors.secondaryText }}>
              ¿Ya tienes una cuenta?{" "}
              <Link
                to="/login"
                className="hover:underline"
                style={{ color: theme.colors.accent }}
              >
                Inicia Sesión
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
              Tip: Personaliza tu perfil para desbloquear logros especiales
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
