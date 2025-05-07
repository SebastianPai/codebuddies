"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ThemeColors {
  background: string;
  text: string;
  secondaryText: string;
  primary: string;
  secondary: string;
  accent: string;
  card: string;
  border: string;
  button: string;
  buttonText: string;
  codeBackground: string;
  codeText: string;
  success: string;
  error: string;
  accenttwo: string;
  highlightText: string; // Nuevo: para texto destacado
  secondaryButton: string; // Nuevo: para botón secundario
  progressBackground: string; // Nuevo: fondo de la barra de progreso
  progressFill: string; // Nuevo: relleno de la barra de progreso
}

interface Theme {
  name: "dark" | "light" | "pink";
  colors: ThemeColors;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: "dark" | "light" | "pink") => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themes: Record<"dark" | "light" | "pink", Theme> = {
  dark: {
    name: "dark",
    colors: {
      background: "#0a0e1a",
      text: "#ffffff",
      secondaryText: "#d1d5db",
      primary: "#facc15",
      secondary: "#9ca3af",
      accent: "#facc15",
      accenttwo: "#7c3aed",
      card: "#151a2d",
      border: "#374151",
      button: "#facc15",
      buttonText: "#000000",
      codeBackground: "#1e1e1e",
      codeText: "#d1d5db",
      success: "#4CAF50",
      error: "#f87171",
      highlightText: "#facc15", // Texto destacado
      secondaryButton: "#2d3250", // Botón secundario
      progressBackground: "#374151", // Gris oscuro para fondo
      progressFill: "#facc15", // Amarillo para relleno
    },
  },
  light: {
    name: "light",
    colors: {
      background: "#f3f4f6",
      text: "#111827",
      primary: "#2563eb",
      secondary: "#6b7280",
      secondaryText: "#374151",
      accent: "#7c3aed",
      accenttwo: "#2563eb",
      card: "#ffffff",
      border: "#d1d5db",
      button: "#2563eb",
      buttonText: "#ffffff",
      codeBackground: "#f1f5f9",
      codeText: "#1f2937",
      success: "#4CAF50",
      error: "#f87171",
      highlightText: "#f59e0b", // Texto destacado (amarillo suave)
      secondaryButton: "#6b7280", // Botón secundario (gris)
      progressBackground: "#d1d5db", // Gris claro para fondo
      progressFill: "#2563eb", // Azul para relleno
    },
  },
  pink: {
    name: "pink",
    colors: {
      background: "#fff1f2",
      text: "#4b1c46",
      secondaryText: "#6b7280",
      primary: "#db2777",
      secondary: "#9d174d",
      accent: "#ec4899",
      accenttwo: "#db2777",
      card: "#fce7f3",
      border: "#f9a8d4",
      button: "#ec4899",
      buttonText: "#ffffff",
      codeBackground: "#fdf2f8",
      codeText: "#831843",
      success: "#4CAF50",
      error: "#f87171",
      highlightText: "#f472b6", // Texto destacado (rosa claro)
      secondaryButton: "#9d174d", // Botón secundario (rosa oscuro)
      progressBackground: "#f9a8d4", // Rosa claro para fondo
      progressFill: "#ec4899", // Rosa brillante para relleno
    },
  },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(themes.dark);

  const changeTheme = (themeName: "dark" | "light" | "pink") => {
    setTheme(themes[themeName]);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: changeTheme }}>
      <div
        style={{
          background: theme.colors.background,
          color: theme.colors.text,
          minHeight: "100vh",
        }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme debe usarse dentro de un ThemeProvider");
  }
  return context;
}
