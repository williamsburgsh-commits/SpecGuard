import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  INFRASTRUCTURE_PROGRAM_IDS,
  JUPITER_AGGREGATOR_V6_PROGRAM_ID,
  JUPITER_TRIGGER_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "./programs.js";

export const VENUE_SLUGS = [
  "system",
  "jupiter-swap",
  "jupiter-trigger",
  "spl-token",
] as const;

export type VenueSlug = (typeof VENUE_SLUGS)[number];

const VENUE_PROGRAMS: Record<VenueSlug, readonly string[]> = {
  system: INFRASTRUCTURE_PROGRAM_IDS,
  "jupiter-swap": [JUPITER_AGGREGATOR_V6_PROGRAM_ID],
  "jupiter-trigger": [JUPITER_TRIGGER_PROGRAM_ID],
  "spl-token": [
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  ],
};

const infraSet = new Set<string>(INFRASTRUCTURE_PROGRAM_IDS);

export function programsForVenues(venueSlugs: readonly string[]): Set<string> {
  const allowed = new Set<string>();
  for (const slug of venueSlugs) {
    const programs = VENUE_PROGRAMS[slug as VenueSlug];
    if (programs) {
      for (const id of programs) allowed.add(id);
    }
  }
  return allowed;
}

/** Program IDs that are not infrastructure and not in allowed venue slugs. */
export function findDisallowedPrograms(
  programIds: readonly string[],
  allowedVenueSlugs: readonly string[],
): string[] {
  const allowed = programsForVenues(allowedVenueSlugs);
  const seen = new Set<string>();
  const disallowed: string[] = [];
  for (const id of programIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (infraSet.has(id)) continue;
    if (allowed.has(id)) continue;
    disallowed.push(id);
  }
  return disallowed;
}

export function isVenueSlug(value: string): value is VenueSlug {
  return (VENUE_SLUGS as readonly string[]).includes(value);
}
