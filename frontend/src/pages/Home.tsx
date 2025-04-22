import { Link } from "react-router-dom";
import type { JSX } from "react";

export default function Home(): JSX.Element {
  return (
    <div className="p-6 text-center">
      <h1 className="text-4xl font-bold text-blue-500">
        Bienvenido a CodeBuddies
      </h1>
      <p className="mt-4 text-lg">Este es el inicio de algo grande.</p>

      <div className="mt-6 space-x-4">
        <Link
          to="/login"
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Iniciar sesión
        </Link>
        <Link
          to="/dashboard"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Ir al Dashboard
        </Link>
        <Link
          to="/register"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Ir al registro
        </Link>
        <div className="bg-red-500 text-white p-4">
          Si ves esto rojo, Tailwind sí funciona.
        </div>
      </div>
    </div>
  );
}
