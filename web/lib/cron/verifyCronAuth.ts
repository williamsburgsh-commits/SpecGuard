export function verifyCronAuth(
  authHeader: string | null,
  cronSecret: string | undefined,
): boolean {
  if (!cronSecret) return false;
  const expected = `Bearer ${cronSecret}`;
  return authHeader === expected;
}
