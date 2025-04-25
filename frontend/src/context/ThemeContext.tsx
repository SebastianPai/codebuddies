"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ThemeColors {
  background: string;
  text: string;
  primary: string;
  secondary: string;
  accent: string;
  card: string;
  border: string;
  button: string;
  buttonText: string;
  codeBackground: string;
  codeText: string;
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
      primary: "#1e40af",
      secondary: "#6b7280",
      accent: "#a855f7",
      card: "#151a2d",
      border: "#374151",
      button: "#3b82f6",
      buttonText: "#ffffff",
      codeBackground: "#1e1e1e",
      codeText: "#d1d5db",
    },
  },
  light: {
    name: "light",
    colors: {
      background: "#f3f4f6",
      text: "#111827",
      primary: "#2563eb",
      secondary: "#6b7280",
      accent: "#7c3aed",
      card: "#ffffff",
      border: "#d1d5db",
      button: "#2563eb",
      buttonText: "#ffffff",
      codeBackground: "#f1f5f9",
      codeText: "#1f2937",
    },
  },
  pink: {
    name: "pink",
    colors: {
      background: "#fff1f2",
      text: "#4b1c46",
      primary: "#db2777",
      secondary: "#9d174d",
      accent: "#ec4899",
      card: "#fce7f3",
      border: "#f9a8d4",
      button: "#ec4899",
      buttonText: "#ffffff",
      codeBackground: "#fdf2f8",
      codeText: "#831843",
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
