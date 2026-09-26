import { describe, it, expect } from 'vitest';
import {
  evaluateSubmitResponse,
  canVillainPerceiveSubmission,
} from './submitContract';
import { TopologyConnection } from './cohortBehaviors';

describe('submitContract - Turn N+1 Villain Response Contract (§5.4)', () => {
  const baseConnections: TopologyConnection[] = [
    { fromNodeId: 'hall-1', toNodeId: 'hall-2', status: 'OPEN', kind: 'DOOR' },
    { fromNodeId: 'hall-2', toNodeId: 'attic', status: 'LOCKED', kind: 'DOOR' },
  ];

  describe('Diegetic Perception Gating', () => {
    it('perceives submission when villain and victim are co-located in the same node', () => {
      const placement = {
        'villain-jason': 'hall-1',
        'victim-dale': 'hall-1',
      };

      const perceivable = canVillainPerceiveSubmission(
        'villain-jason',
        'victim-dale',
        placement,
        baseConnections
      );
      expect(perceivable).toBe(true);

      const result = evaluateSubmitResponse({
        villainId: 'villain-jason',
        submittedCharId: 'victim-dale',
        castPlacement: placement,
        topologyConnections: baseConnections,
      });

      expect(result.canPerceive).toBe(true);
      expect(result.outcome).toBe('REJECT'); // default fallback
    });

    it('perceives submission when villain is in an adjacent node with an OPEN edge', () => {
      const placement = {
        'villain-jason': 'hall-1',
        'victim-dale': 'hall-2',
      };

      const perceivable = canVillainPerceiveSubmission(
        'villain-jason',
        'victim-dale',
        placement,
        baseConnections
      );
      expect(perceivable).toBe(true);
    });

    it('blocks perception when villain is behind a LOCKED door or in a distant node', () => {
      const placement = {
        'villain-jason': 'hall-1',
        'victim-dale': 'attic', // Behind locked door from hall-2, disconnected from hall-1
      };

      const perceivable = canVillainPerceiveSubmission(
        'villain-jason',
        'victim-dale',
        placement,
        baseConnections
      );
      expect(perceivable).toBe(false);

      const result = evaluateSubmitResponse({
        villainId: 'villain-jason',
        submittedCharId: 'victim-dale',
        castPlacement: placement,
        topologyConnections: baseConnections,
      });

      expect(result.canPerceive).toBe(false);
      expect(result.outcome).toBe('UNPERCEIVED');
      expect(result.targetStancePostState).toBe('SUBMITTED');
    });
  });

  describe('Human Villain Decision Presentation (Invariant 6)', () => {
    it('presents choice payload to human villain without overriding player sovereignty', () => {
      const result = evaluateSubmitResponse({
        villainId: 'player-bateman',
        submittedCharId: 'victim-colleague',
        isVillainHuman: true,
      });

      expect(result.canPerceive).toBe(true);
      expect(result.outcome).toBe('AWAITING_HUMAN_CHOICE');
      expect(result.humanPromptPayload).toBeDefined();
      expect(result.humanPromptPayload?.villainId).toBe('player-bateman');
      expect(result.humanPromptPayload?.targetCharacterId).toBe('victim-colleague');
      expect(result.humanPromptPayload?.suggestedOptions.length).toBeGreaterThanOrEqual(4);
      expect(result.targetStancePostState).toBe('SUBMITTED');
    });
  });

  describe('Autonomous NPC Authored Contract Evaluation', () => {
    it('evaluates authored ACCEPT contract: spares victim', () => {
      const result = evaluateSubmitResponse({
        villainId: 'villain-cultist-leader',
        submittedCharId: 'victim-dale',
        submitResponseContract: {
          'villain-cultist-leader': 'ACCEPT',
        },
      });

      expect(result.outcome).toBe('ACCEPT');
      expect(result.targetStancePostState).toBe('WITHDRAWN');
      expect(result.description).toContain('accepting');
    });

    it('evaluates authored PUNISH contract: inflicts calculated harm/humiliation', () => {
      const result = evaluateSubmitResponse({
        villainId: 'villain-inquisitor',
        submittedCharId: 'victim-dale',
        submitResponseContract: {
          'villain-inquisitor': 'PUNISH',
        },
      });

      expect(result.outcome).toBe('PUNISH');
      expect(result.targetStancePostState).toBe('AFRAID');
      expect(result.description).toContain('punishes');
    });

    it('evaluates authored IGNORE contract: steps past victim', () => {
      const result = evaluateSubmitResponse({
        villainId: 'villain-golem',
        submittedCharId: 'victim-dale',
        submitResponseContract: {
          'villain-golem': 'IGNORE',
        },
      });

      expect(result.outcome).toBe('IGNORE');
      expect(result.targetStancePostState).toBe('WITHDRAWN');
      expect(result.description).toContain('contempt');
    });

    it('evaluates authored REJECT contract and defaults to REJECT when unauthored', () => {
      const explicitReject = evaluateSubmitResponse({
        villainId: 'villain-slasher',
        submittedCharId: 'victim-dale',
        submitResponseContract: {
          'villain-slasher': 'REJECT',
        },
      });
      expect(explicitReject.outcome).toBe('REJECT');
      expect(explicitReject.targetStancePostState).toBe('AFRAID');

      const defaultReject = evaluateSubmitResponse({
        villainId: 'villain-unknown',
        submittedCharId: 'victim-dale',
        submitResponseContract: {},
      });
      expect(defaultReject.outcome).toBe('REJECT');
      expect(defaultReject.targetStancePostState).toBe('AFRAID');
    });

    it('evaluates custom authored responses with exact outcome preservation', () => {
      const customResponse = evaluateSubmitResponse({
        villainId: 'villain-overlord',
        submittedCharId: 'victim-dale',
        submitResponseContract: {
          'villain-overlord': 'ENSLAVE',
        },
      });
      expect(customResponse.outcome).toBe('ENSLAVE');
      expect(customResponse.targetStancePostState).toBe('WITHDRAWN');
      expect(customResponse.description).toContain('ENSLAVE');
    });

    it('perceives submission when connection is defined from submitted character node in spatialGraph', () => {
      const spatialGraph = [
        {
          id: 'node-a',
          name: 'Node A',
          description: '',
          exits: [],
        },
        {
          id: 'node-b',
          name: 'Node B',
          description: '',
          exits: [{ description: 'north', targetNodeId: 'node-a', isOpen: true }],
        },
      ];

      const result = evaluateSubmitResponse({
        villainId: 'villain-a',
        submittedCharId: 'victim-b',
        castPlacement: {
          'villain-a': 'node-a',
          'victim-b': 'node-b',
        },
        spatialGraph,
      });

      expect(result.canPerceive).toBe(true);
    });
  });
});
