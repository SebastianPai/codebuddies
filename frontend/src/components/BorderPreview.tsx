// src/components/BorderPreview.tsx
import { ReactNode, useEffect, useRef } from "react";
import { Border } from "@/types";

interface BorderPreviewProps {
  border?: Border | null;
  size?: number;
  children: ReactNode;
}

const BorderPreview: React.FC<BorderPreviewProps> = ({
  border,
  size = 40,
  children,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (border?.properties?.animation === "snake" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = size / 2 - 3;
      let angle = 0;

      const drawSnake = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.strokeStyle = border.properties?.color || "green";
        ctx.lineWidth = 5; // Aumentado para visibilidad
        const startAngle = angle;
        const endAngle = angle + Math.PI / 4;
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.stroke();
        angle += border.properties?.speed || 0.05;
        if (angle >= 2 * Math.PI) angle = 0;
        requestAnimationFrame(drawSnake);
      };

      drawSnake();
    }
  }, [border, size]);

  const getBorderClassAndStyle = () => {
    if (!border || !border.properties) {
      return { className: "", style: { border: "none" } };
    }

    const { properties } = border;

    if (properties.animation === "rainbow") {
      return {
        className: "border-rainbow",
        style: { border: "none" },
      };
    }

    if (properties.animation === "sparkle") {
      return {
        className: "border-sparkle",
        style: {
          border: "none",
          "--sparkle-intensity": properties.intensity || 0.8,
        } as React.CSSProperties,
      };
    }

    return {
      className: "",
      style: {
        border: `3px solid ${properties.color || "#000"}`, // Ajustado
      },
    };
  };

  const { className, style } = getBorderClassAndStyle();

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {border?.properties?.animation === "snake" && (
        <canvas
          ref={canvasRef}
          width={size + 10} // Ajustado para borde más grueso
          height={size + 10}
          className="absolute top-[-5px] left-[-5px] z-0"
        />
      )}
      <div
        className={`w-full h-full rounded-full overflow-hidden ${className}`}
        style={style}
      >
        {children}
      </div>
    </div>
  );
};

export default BorderPreview;
