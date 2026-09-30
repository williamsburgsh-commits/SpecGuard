"use client";

import { Marquee } from "@/components/ui/marquee";
import type { LandingData } from "@/lib/home/loadLanding";
import { usePrefersReducedMotion } from "@/lib/motion/usePrefersReducedMotion";

const SOURCE_LABEL = {
  registry: "CHECKS",
  recorded: "RECORDED",
  demo: "DEMO FEED",
} as const;

export function EventTicker({
  events,
  eventSource,
}: {
  events: LandingData["events"];
  eventSource: LandingData["eventSource"];
}) {
  const reduced = usePrefersReducedMotion();
  const items = events.length > 0 ? events : [{ text: "EXAMPLE · no checks yet" }];

  return (
    <div className="border-y border-[#2A2824] bg-[#0B0B0A]">
      <div className="flex items-stretch">
        <p className="hidden shrink-0 items-center border-r border-[#2A2824] px-4 font-mono text-[10px] tracking-[0.16em] text-[#A39E93] sm:flex">
          {SOURCE_LABEL[eventSource]}
        </p>
        <Marquee
          pauseOnHover
          reducedMotion={reduced}
          className="min-w-0 flex-1 py-2.5"
          aria-label={
            eventSource === "demo" ? "Demo feed of example checks" : "Recent operator checks"
          }
        >
          {items.map((event) => (
            <span
              key={event.text}
              className="px-4 font-mono text-[12px] tracking-wide text-[#F4F1EA] tabular-nums"
            >
              {event.text}
              <span className="px-4 text-[#2A2824]" aria-hidden>
                |
              </span>
            </span>
          ))}
        </Marquee>
      </div>
      <p className="border-t border-[#2A2824] px-4 py-1 font-mono text-[10px] tracking-[0.16em] text-[#A39E93] sm:hidden">
        {SOURCE_LABEL[eventSource]}
      </p>
    </div>
  );
}
