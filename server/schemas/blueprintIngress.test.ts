import { describe, expect, it } from 'vitest';
import { EngineTurnRequestSchema, TestSceneRequestSchema } from './index';

describe('server schema blueprint ingress validation', () => {
  it('rejects EngineTurnRequestSchema when blueprint contains malformed explicit nested values', () => {
    const invalidRequest = {
      blueprint: {
        identity: 42,
        topology: 'bad',
        userCharacterId: 99,
      },
    };

    const result = EngineTurnRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('rejects TestSceneRequestSchema when blueprint contains a malformed explicit field/container', () => {
    const invalidRequest = {
      blueprint: {
        identity: { title: 42 },
      },
    };

    const result = TestSceneRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('accepts EngineTurnRequestSchema with a representative supported legacy blueprint and returns canonical normalized values', () => {
    const validLegacyRequest = {
      sessionId: 'session-123',
      turnId: 'turn-1',
      blueprint: {
        title: 'Legacy Crypt',
        globalPremise: 'Survive the crypt.',
        topology: {
          nodes: ['ENTRY', 'VAULT'],
          connections: ['ENTRY -> VAULT'],
        },
      },
    };

    const result = EngineTurnRequestSchema.safeParse(validLegacyRequest);
    expect(result.success).toBe(true);
    if (result.success && result.data.blueprint) {
      expect(result.data.blueprint.identity.title).toBe('Legacy Crypt');
      expect(result.data.blueprint.title).toBe('Legacy Crypt');
      expect(result.data.blueprint.premise).toBe('Survive the crypt.');
      expect(result.data.blueprint.topology.connections).toHaveLength(1);
      expect(result.data.blueprint.topology.connections[0]).toEqual({
        from: 'ENTRY',
        to: 'VAULT',
        kind: 'PHYSICAL',
        userInitiated: true,
        legacyUpgraded: true,
      });
    }
  });
});
