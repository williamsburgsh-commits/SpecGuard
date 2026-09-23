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
