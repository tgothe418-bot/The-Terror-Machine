import { z } from 'zod';
import { BlueprintSchema, Blueprint } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeLegacyBlueprintShape(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return raw;
  }

  const rawRecord = raw;

  // Extract protagonist ID if present in legacy perspectives
  let protagonistId: string | undefined = undefined;
  if (typeof rawRecord.userCharacterId === 'string') {
    protagonistId = rawRecord.userCharacterId;
  } else if (Array.isArray(rawRecord.perspectives)) {
    const found = rawRecord.perspectives.find(
      (p) => isRecord(p) && p.role === 'PROTAGONIST'
    );
    if (isRecord(found) && typeof found.subjectCharacterId === 'string') {
      protagonistId = found.subjectCharacterId;
    }
  }

  // Normalize topology connections
  const topologyRaw = isRecord(rawRecord.topology) ? rawRecord.topology : undefined;
  const rawConnections = topologyRaw && Array.isArray(topologyRaw.connections) ? topologyRaw.connections : [];

  const normalizedConnections = rawConnections.map((conn) => {
    if (typeof conn === 'string') {
      const parts = conn.split('->').map((s: string) => s.trim());
      return {
        from: parts[0] || '',
        to: parts[1] || '',
        kind: 'PHYSICAL',
        userInitiated: true,
        legacyUpgraded: true,
      };
    }

    if (!isRecord(conn)) {
      return conn;
    }

    const safeConn = { ...conn };
    const validKinds = [
      'PHYSICAL',
      'FORCED_EVENT',
      'MEMORY_RECONSTRUCTION',
      'HISTORICAL_REFERENCE',
      'TERMINAL_EJECTION',
      'AUTHORED_PARADOX',
    ];

    let upperKind = String(safeConn.kind || 'PHYSICAL').toUpperCase();
    if (upperKind === 'SPATIAL') upperKind = 'PHYSICAL';
    if (upperKind === 'NARRATIVE') upperKind = 'FORCED_EVENT';
    if (!validKinds.includes(upperKind)) upperKind = 'PHYSICAL';
    safeConn.kind = upperKind;

    if (safeConn.userInitiated === undefined) {
      safeConn.userInitiated = safeConn.kind === 'PHYSICAL';
    }

    return safeConn;
  });

  const identityRaw = isRecord(rawRecord.identity) ? rawRecord.identity : undefined;
  const titleFallback =
    (typeof identityRaw?.title === 'string' && identityRaw.title) ||
    (typeof rawRecord.title === 'string' && rawRecord.title) ||
    'Unknown';

  const premiseFallback =
    (typeof rawRecord.globalPremise === 'string' && rawRecord.globalPremise) ||
    (typeof rawRecord.premise === 'string' && rawRecord.premise) ||
    '';

  return {
    ...rawRecord,
    topology: {
      ...(topologyRaw || {}),
      connections: normalizedConnections,
    },
    identity: {
      ...(identityRaw || {}),
      title: titleFallback,
    },
    title: titleFallback,
    premise: premiseFallback,
    userCharacterId: protagonistId,
  };
}

export const NormalizedBlueprintSchema = z.preprocess(
  normalizeLegacyBlueprintShape,
  BlueprintSchema
);

export function normalizeBlueprint(raw: unknown): Blueprint {
  return NormalizedBlueprintSchema.parse(raw);
}
