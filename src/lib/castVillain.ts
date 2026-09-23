/** Minimal shape needed to decide villain status; accepts draft or blueprint members. */
export interface VillainCheckable {
  disposition?: unknown;
  isEntity?: unknown;
  role?: unknown;
}

/**
 * Canonical villain test, mirroring the engine's seat-availability rule:
 * explicit VILLAIN disposition, entity flag, or ANTAGONIST/VILLAIN role.
 * Case-insensitive on string fields.
 */
export function isVillainCastMember(member: VillainCheckable | null | undefined): boolean {
  if (!member || typeof member !== 'object') return false;
  const m = member as { disposition?: unknown; isEntity?: unknown; role?: unknown };
  if (String(m.disposition ?? '').toUpperCase().trim() === 'VILLAIN') return true;
  if (m.isEntity === true) return true;
  const role = String(m.role ?? '').toUpperCase().trim();
  return role === 'ANTAGONIST' || role === 'VILLAIN';
}
