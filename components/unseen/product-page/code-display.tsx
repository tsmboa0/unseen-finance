"use client";

import type { CodeToken } from "@/components/unseen/product-page/product-code-snippets";

export function ProductCodeDisplay({ lines }: { lines: CodeToken[][] }) {
  return (
    <pre className="code-display product-detail-page__code-pre">
      {lines.map((line, lineIndex) => (
        <div className="code-display__line" key={`line-${lineIndex}`}>
          {line.map((token, tokenIndex) => (
            <span className={token.className ?? "code-default"} key={`t-${lineIndex}-${tokenIndex}`}>
              {token.text}
            </span>
          ))}
        </div>
      ))}
    </pre>
  );
}
