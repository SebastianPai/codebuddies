"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const id = useId();
  return (
    <>
      <span data-tooltip-id={id} data-tooltip-content={content} tabIndex={0}>
        {children}
      </span>
      {/*
        react-tooltip renders its own portal outside our component tree, so it can't
        be styled with Tailwind classes directly; the `style` prop is the library's
        documented override mechanism. Values below intentionally mirror our scale:
        rounded-lg (0.5rem), text-xs (0.75rem), py-1.5/px-2.5 (0.375rem/0.625rem).
      */}
      <ReactTooltip
        id={id}
        style={{
          backgroundColor: "rgb(var(--card))",
          color: "rgb(var(--text))",
          border: "1px solid rgb(var(--border))",
          borderRadius: "0.5rem",
          fontSize: "0.75rem",
          padding: "0.375rem 0.625rem",
          zIndex: 60,
        }}
        opacity={1}
      />
    </>
  );
}
