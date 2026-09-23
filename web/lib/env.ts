import { z } from "zod";
import { loadRootEnvOnce } from "./loadRootEnv";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SPECGUARD_AGENT_WALLET: z.string().min(32),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  HELIUS_WEBHOOK_AUTH_HEADER: z.string().min(8),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

let cachedPublic: PublicEnv | null = null;
let cached: ServerEnv | null = null;

export function getPublicEnv(): PublicEnv {
  if (cachedPublic) return cachedPublic;
  loadRootEnvOnce();
  cachedPublic = publicSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SPECGUARD_AGENT_WALLET:
      process.env.NEXT_PUBLIC_SPECGUARD_AGENT_WALLET,
  });
  return cachedPublic;
}

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  loadRootEnvOnce();
  cached = serverSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    HELIUS_WEBHOOK_AUTH_HEADER: process.env.HELIUS_WEBHOOK_AUTH_HEADER,
    NEXT_PUBLIC_SPECGUARD_AGENT_WALLET:
      process.env.NEXT_PUBLIC_SPECGUARD_AGENT_WALLET,
  });
  return cached;
}
