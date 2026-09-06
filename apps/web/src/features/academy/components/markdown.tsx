"use client";

import { Fragment, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { classNames } from "@/shared/utils/class-names";
import { CodeBlock } from "./code-block";

// Envoltorio fino sobre react-markdown + remark-gfm (mismo stack que ya usa
// shared/ui/markdown-editor y el runner de ejercicios) con un mapa de
// componentes compartido: el código con fence sale por <CodeBlock> (Prism +
// copiar), los links abren en pestaña nueva, y la tipografía la pone la
// clase `.cb-prose` de globals.css. Sin rehype-raw: el contenido lo redacta
// un admin pero no hace falta abrir la superficie a HTML crudo.
const markdownComponents: Components = {
  pre: ({ children }) => <Fragment>{children}</Fragment>,
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className ?? "");
    const raw = String(children ?? "").replace(/\n$/, "");
    if (match) {
      return <CodeBlock language={match[1]} code={raw} />;
    }
    return (
      <code className={classNames("cb-prose-code", className)} {...props}>
        {children}
      </code>
    );
  },
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  ),
};

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps): ReactNode {
  return (
    <div className={classNames("cb-prose", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
