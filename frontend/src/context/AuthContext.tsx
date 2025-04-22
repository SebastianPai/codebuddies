import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// 👉 Definimos cómo luce el usuario
interface User {
  email: string;
  userId: string;
}

// 👉 Definimos el shape del contexto
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// 👉 Creamos el contexto con valor inicial null (lo vamos a validar luego)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 👉 Props para el Provider
interface AuthProviderProps {
  children: ReactNode;
}

// 👉 El provider en sí
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser({ email: payload.email, userId: payload.userId });
      } catch (e) {
        console.error("Token inválido", e);
        setUser(null);
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("http://localhost:5000/api/users/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error al iniciar sesión");

    const payload = JSON.parse(atob(data.token.split(".")[1]));
    localStorage.setItem("token", data.token);
    setUser({ email: payload.email, userId: payload.userId });
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// 👉 Hook personalizado, con validación de contexto
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return context;
}
