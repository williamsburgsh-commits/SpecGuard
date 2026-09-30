"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  className,
  label = "code",
}: {
  code: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className={cn("border border-[#2A2824] bg-[#141311]", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-[#2A2824] px-3 py-2">
        <p className="min-w-0 truncate font-mono text-[10px] tracking-[0.16em] text-[#A39E93] uppercase">
          {label}
        </p>
        <button
          type="button"
          className="shrink-0 border border-[#2A2824] px-2.5 py-1 font-mono text-[11px] tracking-wide text-[#A39E93] hover:border-[#22C55E] hover:text-[#22C55E]"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-[#F4F1EA] sm:text-sm">
        {code}
      </pre>
    </div>
  );
}
