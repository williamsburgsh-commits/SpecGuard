"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className={cn("sg-card relative overflow-hidden", className)}>
      <button
        type="button"
        className="absolute right-3 top-3 rounded-full border border-[#ffffff18] px-3 py-1 text-xs text-[#8888aa] hover:border-[#00f5c4] hover:text-[#00f5c4]"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto p-5 pr-20 font-mono text-xs leading-relaxed text-[#8888aa] sm:text-sm">
        {code}
      </pre>
    </div>
  );
}
