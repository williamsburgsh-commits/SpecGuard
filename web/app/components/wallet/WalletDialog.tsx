"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export function WalletDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-dialog-title"
        className={cn(
          "sg-card relative z-10 max-h-[min(90vh,640px)] w-full max-w-[400px] overflow-hidden overflow-y-auto",
          className,
        )}
      >
        <div className="border-b border-[#ffffff0f] px-5 py-4 text-center">
          <div className="flex items-center justify-between">
            <span className="w-8" />
            <h2 id="wallet-dialog-title" className="text-lg font-semibold">
              {title}
            </h2>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8888aa] hover:bg-[#ffffff0f] hover:text-white"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
            >
              ×
            </button>
          </div>
          {subtitle ? <p className="mt-1 text-sm text-[#8888aa]">{subtitle}</p> : null}
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function WalletPanelShell({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("sg-card mx-auto w-full max-w-[400px] overflow-hidden", className)}>
      <div className="border-b border-[#ffffff0f] px-5 py-4 text-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-[#8888aa]">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}
