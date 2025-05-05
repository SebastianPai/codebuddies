"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { apiGet, apiPost } from "../api";
import Modal from "react-modal";
import WelcomeScreen from "../components/common/WelcomeScreen";
import { useTheme } from "@/context/ThemeContext";

if (typeof window !== "undefined") {
  Modal.setAppElement("#root");
}

interface AuthUser {
  id: string;
  name: string;
  email: string;
  level: number;
  xp: number;
  maxXp: number;
  profilePicture?: string;
  university?: string;
  isUniversityStudent?: boolean;
  achievements?: { name: string; description: string; awardedAt?: string }[];
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const { theme } = useTheme();

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true, state: { fromCourse: true } });
      throw new Error("Por favor, inicia sesión para acceder al curso.");
    }
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
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
        navigate("/login", { replace: true, state: { fromCourse: true } });
        toast.error("Sesión expirada. Por favor, inicia sesión de nuevo.");
        throw new Error("Token inválido o usuario no autenticado");
      }
      return response;
    } catch (error) {
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
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          level: data.user.level || 1,
          xp: data.user.xp || 0,
          maxXp: data.user.maxXp || 100,
          profilePicture: data.user.profilePicture || "",
          university: data.user.university || "",
          isUniversityStudent: data.user.isUniversityStudent || false,
          achievements: data.user.achievements || [],
        })
      );
      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        level: data.user.level || 1,
        xp: data.user.xp || 0,
        maxXp: data.user.maxXp || 100,
        profilePicture: data.user.profilePicture || "",
        university: data.user.university || "",
        isUniversityStudent: data.user.isUniversityStudent || false,
        achievements: data.user.achievements || [],
      });
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
    setIsModalOpen(false);
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
            profilePicture: data.user.profilePicture || "",
            university: data.user.university || "",
            isUniversityStudent: data.user.isUniversityStudent || false,
            achievements: data.user.achievements || [],
          };
          setUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
        } catch (error) {
          logout();
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  useEffect(() => {
    if (user && !localStorage.getItem("hasSeenWelcome")) {
      setIsModalOpen(true);
      localStorage.setItem("hasSeenWelcome", "true");
    }
  }, [user]);

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, fetchWithAuth, updateUser }}
    >
      {children}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        style={{
          content: {
            background: "transparent",
            border: "none",
            padding: 0,
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          },
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
          },
        }}
      >
        {user && (
          <WelcomeScreen
            playerName={user.name}
            level={user.level}
            currentXp={user.xp}
            maxXp={user.maxXp}
            missionTitle="En desarrollo"
            missionProgress={50}
            petName="Bitzi"
          />
        )}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 px-4 py-2 rounded font-bold"
          style={{
            backgroundColor: theme.colors.button,
            color: theme.colors.buttonText,
            border: `2px solid ${theme.colors.text}`,
            zIndex: 10001,
          }}
        >
          Cerrar
        </button>
      </Modal>
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
