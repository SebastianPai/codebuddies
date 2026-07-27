"use client";

import { useTheme } from "next-themes";
import { ToastContainer } from "react-toastify";

import { DEFAULT_TOAST_DURATION_MS } from "../constants/ui";

export function AppToastContainer() {
  const { resolvedTheme } = useTheme();

  return (
    <ToastContainer
      position="top-right"
      autoClose={DEFAULT_TOAST_DURATION_MS}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={resolvedTheme === "light" || resolvedTheme === "pink" ? "light" : "dark"}
    />
  );
}
