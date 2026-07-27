"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

// Botón único para toda la UI del juego: mismos radios, paddings, estados de
// hover/disabled y foco en cualquier ventana/inventario/tienda que lo use,
// en vez de que cada componente reimplemente su propio botón a mano.
const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", fullWidth = false, className = "", type = "button", ...props }, ref) => {
    const classes = [styles.btn, styles[variant], styles[size], fullWidth ? styles.fullWidth : "", className]
      .filter(Boolean)
      .join(" ");

    return <button ref={ref} type={type} className={classes} {...props} />;
  },
);

Button.displayName = "Button";

export default Button;
