import { z } from 'zod';
import { BlueprintSchema, Blueprint } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function normalizeLegacyBlueprintShape(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return raw;
  }

  const rawRecord = raw;

  // Extract protagonist ID if present in legacy perspectives only when userCharacterId is absent/undefined
  let protagonistId: unknown = undefined;
  if (hasOwn(rawRecord, 'userCharacterId')) {
    protagonistId = rawRecord.userCharacterId;
  } else if (Array.isArray(rawRecord.perspectives)) {
    const found = rawRecord.perspectives.find(
      (p) => isRecord(p) && p.role === 'PROTAGONIST'
    );
    if (isRecord(found) && typeof found.subjectCharacterId === 'string') {
      protagonistId = found.subjectCharacterId;
    }
  }

  // Normalize topology and topology.connections
  let topologyNormalized: unknown = undefined;
  if (hasOwn(rawRecord, 'topology')) {
    if (!isRecord(rawRecord.topology)) {
      // Preserve explicitly supplied wrong-typed topology
      topologyNormalized = rawRecord.topology;
    } else {
      const topoRecord = rawRecord.topology;
      let connectionsNormalized: unknown = undefined;
      if (hasOwn(topoRecord, 'connections')) {
        if (!Array.isArray(topoRecord.connections)) {
          // Preserve explicitly supplied wrong-typed connections
          connectionsNormalized = topoRecord.connections;
        } else {
          connectionsNormalized = topoRecord.connections.map((conn) => {
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

            // If kind is absent/undefined, default to PHYSICAL
            if (safeConn.kind === undefined) {
              safeConn.kind = 'PHYSICAL';
            } else if (typeof safeConn.kind === 'string') {
              let upperKind = safeConn.kind.toUpperCase();
              if (upperKind === 'SPATIAL') upperKind = 'PHYSICAL';
              if (upperKind === 'NARRATIVE') upperKind = 'FORCED_EVENT';
              if (!validKinds.includes(upperKind)) upperKind = 'PHYSICAL';
              safeConn.kind = upperKind;
            }
            // If kind is present with non-string, keep it unmodified so EdgeKindSchema rejects it

            if (safeConn.userInitiated === undefined) {
              if (typeof safeConn.kind === 'string') {
                safeConn.userInitiated = safeConn.kind === 'PHYSICAL';
              }
            }

            return safeConn;
          });
        }
      }

      topologyNormalized = {
        ...topoRecord,
        ...(connectionsNormalized !== undefined ? { connections: connectionsNormalized } : {}),
      };
    }
  }

  // Normalize identity and title fallback
  let identityNormalized: unknown = undefined;
  let topLevelTitleNormalized: unknown = undefined;

  const hasIdentity = hasOwn(rawRecord, 'identity');
  const hasTopTitle = hasOwn(rawRecord, 'title');

  if (hasIdentity) {
    if (!isRecord(rawRecord.identity)) {
      // Preserve explicit non-record identity (e.g. 42, null, array, string)
      identityNormalized = rawRecord.identity;
    } else {
      const identRecord = rawRecord.identity;
      let identTitle: unknown = identRecord.title;
      if (identTitle === undefined) {
        if (typeof rawRecord.title === 'string' && rawRecord.title) {
          identTitle = rawRecord.title;
        }
      }
      identityNormalized = {
        ...identRecord,
        ...(identTitle !== undefined ? { title: identTitle } : {}),
      };
    }
  } else {
    // Missing identity: if top-level title is string, populate identity.title
    if (typeof rawRecord.title === 'string' && rawRecord.title) {
      identityNormalized = {
        title: rawRecord.title,
      };
    }
  }

  if (hasTopTitle) {
    topLevelTitleNormalized = rawRecord.title;
  } else if (isRecord(rawRecord.identity) && typeof rawRecord.identity.title === 'string' && rawRecord.identity.title) {
    topLevelTitleNormalized = rawRecord.identity.title;
  }

  // Normalize premise / globalPremise
  let topPremiseNormalized: unknown = undefined;
  let globalPremiseNormalized: unknown = undefined;

  if (hasOwn(rawRecord, 'premise')) {
    topPremiseNormalized = rawRecord.premise;
  } else if (typeof rawRecord.globalPremise === 'string' && rawRecord.globalPremise) {
    topPremiseNormalized = rawRecord.globalPremise;
  }

  if (hasOwn(rawRecord, 'globalPremise')) {
    globalPremiseNormalized = rawRecord.globalPremise;
  } else if (typeof rawRecord.premise === 'string' && rawRecord.premise) {
    globalPremiseNormalized = rawRecord.premise;
  }

  return {
    ...rawRecord,
    ...(topologyNormalized !== undefined ? { topology: topologyNormalized } : {}),
    ...(identityNormalized !== undefined ? { identity: identityNormalized } : {}),
    ...(topLevelTitleNormalized !== undefined ? { title: topLevelTitleNormalized } : {}),
    ...(topPremiseNormalized !== undefined ? { premise: topPremiseNormalized } : {}),
    ...(globalPremiseNormalized !== undefined ? { globalPremise: globalPremiseNormalized } : {}),
    ...(protagonistId !== undefined ? { userCharacterId: protagonistId } : {}),
  };
}

export const NormalizedBlueprintSchema = z.preprocess(
  normalizeLegacyBlueprintShape,
  BlueprintSchema
);

export function normalizeBlueprint(raw: unknown): Blueprint {
  return NormalizedBlueprintSchema.parse(raw);
}
