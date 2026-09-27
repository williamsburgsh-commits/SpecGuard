import { z } from "zod";
import { VENUE_SLUGS } from "../solana/venues.js";

const venueSchema = z.enum(VENUE_SLUGS);

export const PolicyV1Schema = z.object({
  version: z.literal(1),
  name: z.string().min(1).max(64),
  maxDrawdownPct: z.number().min(0).max(100),
  maxSpendPerTxSol: z.number().positive(),
  allowedVenues: z.array(venueSchema).min(1),
  heartbeatIntervalSec: z.number().int().min(60),
});

export type PolicyV1 = z.infer<typeof PolicyV1Schema>;

export function parsePolicyV1(input: unknown): PolicyV1 {
  return PolicyV1Schema.parse(input);
}

export const AGENT_TYPES = [
  "trader",
  "social",
  "data",
  "infra",
  "general",
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

const agentTypeSchema = z.enum(AGENT_TYPES);

export const SpendLimitsSchema = z.object({
  perTxSol: z.number().positive(),
  dailySol: z.number().positive().optional(),
});

export const SocialLimitsSchema = z.object({
  maxPostsPerDay: z.number().int().positive().optional(),
  allowDMs: z.boolean().optional(),
  platforms: z.array(z.string().min(1).max(32)).optional(),
});

const PolicyV2Shape = z.object({
  version: z.literal(2),
  name: z.string().min(1).max(64),
  type: agentTypeSchema,
  heartbeatIntervalSec: z.number().int().min(60),
  spendLimits: SpendLimitsSchema,
  maxDrawdownPct: z.number().min(0).max(100).optional(),
  allowedVenues: z.array(venueSchema).optional(),
  socialLimits: SocialLimitsSchema.optional(),
  allowedTools: z.array(z.string().min(1).max(128)).optional(),
  deniedActions: z.array(z.string().min(1).max(128)).optional(),
});

function refinePolicyV2(
  policy: z.infer<typeof PolicyV2Shape>,
  ctx: z.RefinementCtx,
): void {
  if (policy.type === "trader") {
    if (!policy.allowedVenues || policy.allowedVenues.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Trader policies require at least one allowed venue",
        path: ["allowedVenues"],
      });
    }
  }
  if (policy.allowedTools?.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "allowedTools cannot be an empty list; omit the field to allow any tool",
      path: ["allowedTools"],
    });
  }
  if (policy.allowedVenues?.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "allowedVenues cannot be an empty list",
      path: ["allowedVenues"],
    });
  }
}

export const PolicyV2Schema = PolicyV2Shape.superRefine(refinePolicyV2);

export type PolicyV2 = z.infer<typeof PolicyV2Shape>;
export type SpendLimits = z.infer<typeof SpendLimitsSchema>;
export type SocialLimits = z.infer<typeof SocialLimitsSchema>;

export function parsePolicyV2(input: unknown): PolicyV2 {
  return PolicyV2Schema.parse(input);
}

export const PolicySchema = z
  .discriminatedUnion("version", [PolicyV1Schema, PolicyV2Shape])
  .superRefine((policy, ctx) => {
    if (policy.version === 2) {
      refinePolicyV2(policy, ctx);
    }
  });

export type Policy = PolicyV1 | PolicyV2;

export function parsePolicy(input: unknown): Policy {
  return PolicySchema.parse(input);
}

export function isPolicyV2(policy: Policy): policy is PolicyV2 {
  return policy.version === 2;
}

/** Per-tx SOL spend cap, whichever policy version. */
export function policyPerTxSol(policy: Policy): number {
  return isPolicyV2(policy) ? policy.spendLimits.perTxSol : policy.maxSpendPerTxSol;
}
