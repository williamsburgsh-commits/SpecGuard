"use client";

import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export interface LiveAgentStatus {
  status: "GREEN" | "RED";
  statusSince: string;
  lastTxSig: string | null;
}

export function useAgentStatus(
  wallet: string,
  initial: LiveAgentStatus,
): LiveAgentStatus {
  const [live, setLive] = useState(initial);

  useEffect(() => {
    setLive(initial);
  }, [initial.status, initial.statusSince, initial.lastTxSig]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let channel: RealtimeChannel | null = null;

    channel = supabase
      .channel(`agent-status-${wallet}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agents",
          filter: `wallet=eq.${wallet}`,
        },
        (payload) => {
          const row = payload.new as {
            status?: string;
            status_since?: string;
            last_tx_sig?: string | null;
          };
          if (row.status === "GREEN" || row.status === "RED") {
            setLive({
              status: row.status,
              statusSince: row.status_since ?? live.statusSince,
              lastTxSig: row.last_tx_sig ?? null,
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "status_events",
          filter: `wallet=eq.${wallet}`,
        },
        () => {
          void supabase
            .from("agents")
            .select("status, status_since, last_tx_sig")
            .eq("wallet", wallet)
            .maybeSingle()
            .then(({ data }) => {
              if (data?.status === "GREEN" || data?.status === "RED") {
                setLive({
                  status: data.status,
                  statusSince: data.status_since,
                  lastTxSig: data.last_tx_sig,
                });
              }
            });
        },
      )
      .subscribe();

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [wallet]);

  return live;
}
