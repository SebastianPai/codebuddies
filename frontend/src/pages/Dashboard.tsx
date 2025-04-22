import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import type { JSX } from "react";

export default function Dashboard(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const goTo = (path: string) => () => navigate(path);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0e1a] text-white px-4">
      <h1 className="text-4xl font-bold mb-8">
        Bienvenido, {user?.email || "usuario"} 👋
      </h1>

      <div className="grid gap-4 w-full max-w-md">
        <button
          onClick={goTo("/amigos")}
          className="bg-indigo-600 hover:bg-indigo-700 py-3 px-6 rounded-xl text-white font-semibold shadow transition-all"
        >
          Ver Amigos
        </button>
        <button
          onClick={goTo("/buscar")}
          className="bg-green-600 hover:bg-green-700 py-3 px-6 rounded-xl text-white font-semibold shadow transition-all"
        >
          Buscar Amigos
        </button>
        <button
          onClick={goTo("/solicitudes")}
          className="bg-yellow-500 hover:bg-yellow-600 py-3 px-6 rounded-xl text-black font-semibold shadow transition-all"
        >
          Ver Solicitudes
        </button>
      </div>
    </div>
  );
}
