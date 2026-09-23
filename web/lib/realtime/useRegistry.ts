"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { AgentListRow } from "@/lib/agents/listAgents";

export function useRegistry(onChange: () => void): void {
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const channel = supabase
      .channel("registry-agents")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agents" },
        () => onChange(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [onChange]);
}

export type { AgentListRow };
