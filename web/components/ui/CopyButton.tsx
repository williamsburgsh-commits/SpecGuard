"use client";

import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="border border-[#2A2824] px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-[#A39E93] uppercase hover:border-[#22C55E] hover:text-[#22C55E]"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
