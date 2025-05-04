// frontend/src/context/AuthContext.tsx

import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { apiGet, apiPost } from "../api"; // Importa las funciones de api.tsx

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("token");
    const headers = {
      ...options.headers,
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}${endpoint}`,
        {
          ...options,
          headers,
        }
      );
      if (response.status === 401) {
        logout();
        navigate("/login");
        toast.error("Sesión expirada. Por favor, inicia sesión de nuevo.");
      }
      return response;
    } catch (error) {
      console.error("Fetch error:", error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const data = await apiPost<{ token: string; user: AuthUser }>(
        "/api/users/login",
        {
          email,
          password,
        }
      );

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      navigate("/learn");
    } catch (error: any) {
      toast.error(error.message || "Error al iniciar sesión");
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");
      if (token && user) {
        try {
          const data = await apiGet<{ user: AuthUser }>("/api/users/me", token);
          setUser(data.user);
        } catch (error) {
          logout();
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, fetchWithAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
