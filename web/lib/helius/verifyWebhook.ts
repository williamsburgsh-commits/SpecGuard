export function verifyHeliusAuth(
  authorizationHeader: string | null,
  expected: string,
): boolean {
  if (!authorizationHeader) return false;
  return authorizationHeader === expected;
}
