"use client";

import { classNames } from "@/shared/utils/class-names";
import type { LessonBlock, LessonContentDoc } from "../content/types";
import { CalloutBlock } from "./callout-block";
import { CodeBlock } from "./code-block";
import { Markdown } from "./markdown";

interface LessonContentRendererProps {
  doc: LessonContentDoc;
  className?: string;
}

/** Renderiza el contenido de teoría. Lo comparten la página del estudiante y
 *  la vista previa del admin, así lo que se ve en el editor === lo real. */
export function LessonContentRenderer({
  doc,
  className,
}: LessonContentRendererProps) {
  return (
    <div className={classNames("cb-lesson-content", className)}>
      {doc.blocks.map((block) => (
        <BlockView key={block.id} block={block} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case "heading": {
      const Tag = (`h${block.level}` as const) as "h2" | "h3" | "h4";
      return <Tag className="cb-prose-h">{block.text}</Tag>;
    }
    case "text":
      return <Markdown>{block.markdown}</Markdown>;
    case "note":
      return (
        <div className="cb-note">
          <Markdown>{block.markdown}</Markdown>
        </div>
      );
    case "code":
      return (
        <CodeBlock
          code={block.code}
          language={block.language}
          filename={block.filename}
        />
      );
    case "callout":
      return (
        <CalloutBlock
          variant={block.variant}
          title={block.title}
          markdown={block.markdown}
        />
      );
    case "quote":
      return (
        <blockquote className="cb-quote">
          <p>{block.text}</p>
          {block.cite?.trim() && <cite>{block.cite}</cite>}
        </blockquote>
      );
    case "image":
      return block.url ? (
        <figure className="cb-figure">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.url} alt={block.alt} loading="lazy" />
          {block.caption?.trim() && <figcaption>{block.caption}</figcaption>}
        </figure>
      ) : null;
    case "list":
      return block.ordered ? (
        <ol className="cb-prose cb-list">
          {block.items.map((item, index) => (
            <li key={index}>
              <Markdown>{item}</Markdown>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="cb-prose cb-list">
          {block.items.map((item, index) => (
            <li key={index}>
              <Markdown>{item}</Markdown>
            </li>
          ))}
        </ul>
      );
    case "divider":
      return <hr className="cb-divider" />;
    default:
      return null;
  }
}
