"use client";

import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="rounded-full border border-[#ffffff18] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#8888aa] hover:border-[#00f5c4] hover:text-[#00f5c4]"
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
