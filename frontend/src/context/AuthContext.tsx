"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { apiGet, apiPost } from "../api";

interface Achievement {
  id?: string;
  name: string;
  description: string;
  icon: string;
  image?: string;
  awardedAt?: string;
}

interface Border {
  id: string;
  name: string;
  description: string;
  properties?: { [key: string]: any };
  image: string;
  acquiredAt?: string;
}

interface Tag {
  tagId: string;
  name: string;
  description: string;
  properties?: { [key: string]: any };
  image: string;
  acquiredAt?: string;
}

interface Power {
  powerId: string;
  name: string;
  description: string;
  price: number;
  effect: {
    type: string;
    value: number | string;
    duration: number;
    durationType: string;
  };
  image: string;
  emoji: string;
  usesLeft?: number;
  acquiredAt?: string;
}

interface ActivePower {
  powerId: string;
  name: string;
  description: string;
  price: number;
  effect: {
    type: string;
    value: number | string;
    duration: number;
    durationType: string;
  };
  image: string;
  emoji: string;
  remainingDuration?: number;
  activatedAt?: string;
}

interface AuthUser {
  id: string;
  name: string;
  email: string;
  level: number;
  xp: number;
  maxXp: number;
  coins: number;
  streak: number;
  lives: number;
  profilePicture?: string;
  profileBackground?: string;
  university?: string;
  isUniversityStudent?: boolean;
  achievements?: Achievement[];
  borders?: Border[];
  tags?: Tag[];
  activeBorder?: Border | null;
  activeTag?: Tag | null;
  powers?: Power[];
  activePowers?: ActivePower[];
  role?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<Response>;
  updateUser: (userData: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No se encontró el token en localStorage");
      navigate("/login", { replace: true, state: { fromCourse: true } });
      toast.error("Por favor, inicia sesión para acceder al curso.");
      throw new Error("No se encontró el token de autenticación");
    }
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    console.log("Enviando solicitud a:", endpoint, "con token:", token);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}${endpoint}`,
        {
          ...options,
          headers,
        }
      );
      if (response.status === 401) {
        console.error("Respuesta 401 - Token inválido o expirado");
        logout();
        navigate("/login", { replace: true, state: { fromCourse: true } });
        toast.error("Sesión expirada. Por favor, inicia sesión de nuevo.");
        throw new Error("Token inválido o usuario no autenticado");
      }
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = {};
        }
        console.error("Error en la respuesta:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        throw new Error(
          errorData.message ||
            `Error en la solicitud: ${response.status} ${response.statusText}`
        );
      }
      return response;
    } catch (error) {
      console.error("Error en fetchWithAuth:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error de red. Intenta de nuevo."
      );
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const data = await apiPost<{
        token: string;
        user: AuthUser;
      }>("/api/users/login", {
        email,
        password,
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        level: data.user.level || 1,
        xp: data.user.xp || 0,
        maxXp: data.user.maxXp || 100,
        coins: data.user.coins || 0,
        streak: data.user.streak || 0,
        lives: data.user.lives || 5,
        profilePicture: data.user.profilePicture || "",
        profileBackground: data.user.profileBackground || "",
        university: data.user.university || "",
        isUniversityStudent: data.user.isUniversityStudent || false,
        achievements: data.user.achievements || [],
        borders: data.user.borders || [],
        tags: data.user.tags || [],
        activeBorder: data.user.activeBorder || null,
        activeTag: data.user.activeTag || null,
        powers: data.user.powers || [],
        activePowers: data.user.activePowers || [],
        role: data.user.role || "user",
      });
      localStorage.setItem("hasSeenWelcome", "false"); // Resetear para mostrar en Learn.tsx
      navigate("/learn");
    } catch (error: any) {
      toast.error(error.message || "Error al iniciar sesión");
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("hasSeenWelcome");
    setUser(null);
    navigate("/login", { replace: true });
  };

  const updateUser = (userData: Partial<AuthUser>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");
      if (token && user) {
        try {
          const parsedUser = JSON.parse(user);
          const data = await apiGet<{ user: AuthUser }>("/api/users/me", token);
          const updatedUser = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            level: data.user.level || 1,
            xp: data.user.xp || 0,
            maxXp: data.user.maxXp || 100,
            coins: data.user.coins || 0,
            streak: data.user.streak || 0,
            lives: data.user.lives || 5,
            profilePicture: data.user.profilePicture || "",
            profileBackground: data.user.profileBackground || "",
            university: data.user.university || "",
            isUniversityStudent: data.user.isUniversityStudent || false,
            achievements: data.user.achievements || [],
            borders: data.user.borders || [],
            tags: data.user.tags || [],
            activeBorder: data.user.activeBorder || null,
            activeTag: data.user.activeTag || null,
            powers: data.user.powers || [],
            activePowers: data.user.activePowers || [],
            role: data.user.role || "user",
          };
          setUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
        } catch (error) {
          console.error("Error al inicializar auth:", error);
          logout();
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, fetchWithAuth, updateUser }}
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
