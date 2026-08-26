import { describe, it, expect } from 'vitest';
import {
  createInitialCharacterDevelopmentLedger,
  resolveCharacterDevelopment,
} from './characterDevelopment';

describe('characterDevelopment unit tests', () => {
  it('initializes empty runtime character development ledger', () => {
    const ledger = createInitialCharacterDevelopmentLedger();
    expect(ledger).toEqual({});
  });

  it('establishes new development fact for non-User character with valid cause', () => {
    const preState = createInitialCharacterDevelopmentLedger();
    const receipt = resolveCharacterDevelopment({
      proposal: {
        changes: [
          {
            castMemberId: 'char_ally',
            operation: 'ESTABLISH',
            dimension: 'BELIEF',
            statement: 'Suspects the lab containment field was deliberately disabled from the outside.',
            causeReference: 'act-1-aris-logs',
            rationale: 'Discovered manual override timestamp.',
          },
        ],
      },
      preState,
      currentTurn: 1,
      userCharacterId: 'char_player',
      validCauses: ['act-1-aris-logs'],
    });

    expect(receipt.decisions[0].outcome).toBe('APPLIED');
    expect(receipt.decisions[0].reasonCode).toBe('DEVELOPMENT_FACT_ESTABLISHED');
    expect(receipt.postState.char_ally).toHaveLength(1);
    expect(receipt.postState.char_ally[0].dimension).toBe('BELIEF');
    expect(receipt.postState.char_ally[0].lifecycle).toBe('ACTIVE');
  });

  it('strictly rejects any development proposal targeting the User character', () => {
    const preState = createInitialCharacterDevelopmentLedger();
    const receipt = resolveCharacterDevelopment({
      proposal: {
        changes: [
          {
            castMemberId: 'char_player',
            operation: 'ESTABLISH',
            dimension: 'GOAL',
            statement: 'Decides to sacrifice themselves for the team.',
            causeReference: 'USER_ACTION',
            rationale: 'Player seems heroic.',
          },
        ],
      },
      preState,
      currentTurn: 1,
      userCharacterId: 'char_player',
      validCauses: ['USER_ACTION'],
    });

    expect(receipt.decisions[0].outcome).toBe('REJECTED');
    expect(receipt.decisions[0].reasonCode).toBe('USER_CHARACTER_DEVELOPMENT_FORBIDDEN');
    expect(receipt.postState.char_player).toBeUndefined();
  });

  it('revises existing fact and marks target fact SUPERSEDED', () => {
    const preState = {
      char_ally: [
        {
          id: 'dev-char_ally-1-1',
          castMemberId: 'char_ally',
          dimension: 'BELIEF' as const,
          statement: 'Believes Dr. Evans is trustworthy.',
          lifecycle: 'ACTIVE' as const,
          establishedTurn: 1,
          lastChangedTurn: 1,
          causeReference: 'BASELINE',
        },
      ],
    };

    const receipt = resolveCharacterDevelopment({
      proposal: {
        changes: [
          {
            castMemberId: 'char_ally',
            operation: 'REVISE',
            targetFactId: 'dev-char_ally-1-1',
            dimension: 'BELIEF',
            statement: 'Fears Dr. Evans has been compromised by the signal.',
            causeReference: 'act-2-aris-observation',
            rationale: 'Observed erratic console inputs.',
          },
        ],
      },
      preState,
      currentTurn: 2,
      userCharacterId: 'char_player',
      validCauses: ['act-2-aris-observation'],
    });

    expect(receipt.decisions[0].outcome).toBe('APPLIED');
    expect(receipt.postState.char_ally).toHaveLength(2);
    expect(receipt.postState.char_ally[0].lifecycle).toBe('SUPERSEDED');
    expect(receipt.postState.char_ally[1].lifecycle).toBe('ACTIVE');
    expect(receipt.postState.char_ally[1].statement).toBe(
      'Fears Dr. Evans has been compromised by the signal.'
    );
  });
});
