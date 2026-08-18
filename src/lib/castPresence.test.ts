import { describe, it, expect } from 'vitest';
import {
  buildCharacterPresence,
  createCastPresenceReceipt,
  type CastPresenceSeed,
} from './castPresence';
import type { CharacterPresenceById } from '../types';

describe('castPresence', () => {
  describe('buildCharacterPresence', () => {
    it('canonicalizes non-empty trimmed cast IDs and skips empty, invalid, or duplicate IDs', () => {
      const cast: CastPresenceSeed[] = [
        { id: ' char-1 ' },
        { id: '' },
        { id: '   ' },
        { id: null },
        { id: undefined },
        { id: 'char-1' }, // duplicate
        { id: 'char-2' },
      ];
      const result = buildCharacterPresence(cast, null, ['NODE_A'], 'NODE_A');
      expect(Object.keys(result)).toEqual(['char-1', 'char-2']);
    });

    it('always places player character at currentNodeId, ignoring persisted and starting_location', () => {
      const cast: CastPresenceSeed[] = [
        {
          id: 'char-player',
          isUserCharacter: true,
          starting_location: 'NODE_AUTHORED',
        },
        {
          id: 'char-bound-player',
          isUserCharacter: false,
          starting_location: 'NODE_AUTHORED',
        },
      ];
      const persisted: CharacterPresenceById = {
        'char-player': { nodeId: 'NODE_PERSISTED' },
        'char-bound-player': { nodeId: 'NODE_PERSISTED' },
      };
      const validNodes = ['NODE_CURRENT', 'NODE_PERSISTED', 'NODE_AUTHORED'];

      const result1 = buildCharacterPresence(
        cast,
        persisted,
        validNodes,
        'NODE_CURRENT',
        'char-bound-player',
      );

      expect(result1['char-player'].nodeId).toBe('NODE_CURRENT');
      expect(result1['char-bound-player'].nodeId).toBe('NODE_CURRENT');
    });

    it('uses persisted nodeId for non-player when it exactly exists in validNodeIds', () => {
      const cast: CastPresenceSeed[] = [
        {
          id: 'char-npc',
          starting_location: 'NODE_AUTHORED',
        },
      ];
      const persisted: CharacterPresenceById = {
        'char-npc': { nodeId: 'NODE_PERSISTED' },
      };
      const validNodes = ['NODE_CURRENT', 'NODE_PERSISTED', 'NODE_AUTHORED'];

      const result = buildCharacterPresence(
        cast,
        persisted,
        validNodes,
        'NODE_CURRENT',
      );

      expect(result['char-npc'].nodeId).toBe('NODE_PERSISTED');
    });

    it('falls back to starting_location when persisted nodeId is not in validNodeIds', () => {
      const cast: CastPresenceSeed[] = [
        {
          id: 'char-npc',
          starting_location: 'NODE_AUTHORED',
        },
      ];
      const persisted: CharacterPresenceById = {
        'char-npc': { nodeId: 'NODE_INVALID' },
      };
      const validNodes = ['NODE_CURRENT', 'NODE_AUTHORED'];

      const result = buildCharacterPresence(
        cast,
        persisted,
        validNodes,
        'NODE_CURRENT',
      );

      expect(result['char-npc'].nodeId).toBe('NODE_AUTHORED');
    });

    it('falls back to starting_location when persisted record is absent', () => {
      const cast: CastPresenceSeed[] = [
        {
          id: 'char-npc',
          starting_location: 'NODE_AUTHORED',
        },
      ];
      const validNodes = ['NODE_CURRENT', 'NODE_AUTHORED'];

      const result = buildCharacterPresence(
        cast,
        null,
        validNodes,
        'NODE_CURRENT',
      );

      expect(result['char-npc'].nodeId).toBe('NODE_AUTHORED');
    });

    it('falls back to currentNodeId when starting_location is invalid or not in validNodeIds', () => {
      const cast: CastPresenceSeed[] = [
        {
          id: 'char-npc-1',
          starting_location: 'NODE_UNKNOWN',
        },
        {
          id: 'char-npc-2',
          starting_location: '',
        },
        {
          id: 'char-npc-3',
        },
      ];
      const validNodes = ['NODE_CURRENT'];

      const result = buildCharacterPresence(
        cast,
        null,
        validNodes,
        'NODE_CURRENT',
      );

      expect(result['char-npc-1'].nodeId).toBe('NODE_CURRENT');
      expect(result['char-npc-2'].nodeId).toBe('NODE_CURRENT');
      expect(result['char-npc-3'].nodeId).toBe('NODE_CURRENT');
    });

    it('treats currentNodeId as fallback only when valid and present; does not synthesize a node when validNodeIds is empty', () => {
      const cast: CastPresenceSeed[] = [
        {
          id: 'char-npc',
          starting_location: 'NODE_SOMEWHERE',
        },
      ];
      const persisted: CharacterPresenceById = {
        'char-npc': { nodeId: 'NODE_SOMEWHERE' },
      };

      const result = buildCharacterPresence(
        cast,
        persisted,
        [],
        'NODE_FALLBACK',
      );

      expect(result['char-npc'].nodeId).toBe('NODE_FALLBACK');
    });

    it('fails closed without fabricating synthetic node ID when currentNodeId is missing, blank, or whitespace', () => {
      const cast: CastPresenceSeed[] = [
        {
          id: 'char-player',
          isUserCharacter: true,
          starting_location: 'NODE_AUTHORED',
        },
        {
          id: 'char-npc-valid-persisted',
          starting_location: 'NODE_AUTHORED',
        },
        {
          id: 'char-npc-valid-authored',
          starting_location: 'NODE_AUTHORED',
        },
        {
          id: 'char-npc-invalid',
          starting_location: 'NODE_UNKNOWN',
        },
      ];
      const persisted: CharacterPresenceById = {
        'char-npc-valid-persisted': { nodeId: 'NODE_PERSISTED' },
        'char-npc-invalid': { nodeId: 'NODE_UNKNOWN' },
      };
      const validNodes = ['NODE_PERSISTED', 'NODE_AUTHORED'];

      // Test with null currentNodeId
      const resultNull = buildCharacterPresence(cast, persisted, validNodes, null);
      expect(resultNull['char-player']).toBeUndefined();
      expect(resultNull['char-npc-valid-persisted']).toEqual({ nodeId: 'NODE_PERSISTED' });
      expect(resultNull['char-npc-valid-authored']).toEqual({ nodeId: 'NODE_AUTHORED' });
      expect(resultNull['char-npc-invalid']).toBeUndefined();

      // Test with undefined currentNodeId
      const resultUndefined = buildCharacterPresence(cast, persisted, validNodes, undefined);
      expect(resultUndefined['char-player']).toBeUndefined();
      expect(resultUndefined['char-npc-valid-persisted']).toEqual({ nodeId: 'NODE_PERSISTED' });
      expect(resultUndefined['char-npc-valid-authored']).toEqual({ nodeId: 'NODE_AUTHORED' });
      expect(resultUndefined['char-npc-invalid']).toBeUndefined();

      // Test with blank or whitespace currentNodeId
      const resultBlank = buildCharacterPresence(cast, persisted, validNodes, '   ');
      expect(resultBlank['char-player']).toBeUndefined();
      expect(resultBlank['char-npc-valid-persisted']).toEqual({ nodeId: 'NODE_PERSISTED' });
      expect(resultBlank['char-npc-valid-authored']).toEqual({ nodeId: 'NODE_AUTHORED' });
      expect(resultBlank['char-npc-invalid']).toBeUndefined();
    });

    it('returns fresh records and does not retain input object references', () => {
      const cast: CastPresenceSeed[] = [{ id: 'char-1' }];
      const persistedItem = { nodeId: 'NODE_A' };
      const persisted: CharacterPresenceById = { 'char-1': persistedItem };

      const result = buildCharacterPresence(
        cast,
        persisted,
        ['NODE_A'],
        'NODE_A',
      );

      expect(result['char-1']).not.toBe(persistedItem);
      expect(result['char-1']).toEqual({ nodeId: 'NODE_A' });
    });
  });

  describe('createCastPresenceReceipt', () => {
    it('returns version: 1 with empty state for null or undefined input', () => {
      expect(createCastPresenceReceipt(null)).toEqual({
        version: 1,
        state: {},
      });
      expect(createCastPresenceReceipt(undefined)).toEqual({
        version: 1,
        state: {},
      });
    });

    it('deep-copies state and sorts keys with localeCompare', () => {
      const state: CharacterPresenceById = {
        'char-z': { nodeId: 'NODE_Z' },
        'char-a': { nodeId: 'NODE_A' },
        'char-m': { nodeId: 'NODE_M' },
      };

      const receipt = createCastPresenceReceipt(state);

      expect(receipt.version).toBe(1);
      expect(Object.keys(receipt.state)).toEqual(['char-a', 'char-m', 'char-z']);
      expect(receipt.state['char-a']).toEqual({ nodeId: 'NODE_A' });
      expect(receipt.state['char-a']).not.toBe(state['char-a']);
    });

    it('retains only non-empty string nodeId values', () => {
      const state = {
        'char-valid': { nodeId: 'NODE_A' },
        'char-empty': { nodeId: '' },
        'char-whitespace': { nodeId: '   ' },
        'char-invalid': { nodeId: (null as unknown) as string },
      } as CharacterPresenceById;

      const receipt = createCastPresenceReceipt(state);

      expect(Object.keys(receipt.state)).toEqual(['char-valid']);
      expect(receipt.state['char-valid']).toEqual({ nodeId: 'NODE_A' });
    });
  });
});