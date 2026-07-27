"use client";

import { Copy } from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import { useTranslation } from "@/i18n/useTranslation";
import { classNames } from "../utils/class-names";
import { FOCUS_RING, PRESSABLE } from "./styles";

interface CodeHighlightProps {
  code: string;
  language: string;
  showCopy?: boolean;
}

export function CodeHighlight({
  code,
  language,
  showCopy = false,
}: CodeHighlightProps) {
  const t = useTranslation();
  return (
    <div className="relative">
      <Highlight theme={themes.vsDark} code={code} language={language}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={`${className} overflow-auto rounded-xl p-4`} style={style}>
            {tokens.map((line, lineIndex) => (
              <div key={lineIndex} {...getLineProps({ line })}>
                {line.map((token, tokenIndex) => (
                  <span key={tokenIndex} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
      {showCopy && code.trim() && (
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(code)}
          aria-label={t("common.copyCode")}
          title={t("common.copyCode")}
          className={classNames(
            "absolute right-2 top-2 rounded-lg bg-[rgb(var(--border))] p-1 transition hover:brightness-110 active:brightness-90",
            PRESSABLE,
            FOCUS_RING,
          )}
        >
          <Copy size={16} />
        </button>
      )}
    </div>
  );
}

export default CodeHighlight;
