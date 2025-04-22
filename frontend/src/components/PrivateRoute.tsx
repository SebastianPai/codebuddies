import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ReactNode } from "react";
import type { JSX } from "react";

interface PrivateRouteProps {
  children: ReactNode; // Define que `children` puede ser cualquier nodo React
}

export default function PrivateRoute({
  children,
}: PrivateRouteProps): JSX.Element {
  // Extrae el contexto de autenticación
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
