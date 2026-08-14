import { describe, it, expect } from 'vitest';
import { resolveTransition } from './transitionResolver';

describe('transitionResolver', () => {
  const allowedOutgoingExits = [
    {
      from: 'FOYER',
      to: 'LIBRARY',
      kind: 'PHYSICAL' as const,
      userInitiated: true,
    },
    {
      from: 'FOYER',
      to: 'CELLAR',
      kind: 'PHYSICAL' as const,
      requires: ['RUSTY_KEY'],
      userInitiated: true,
    },
    {
      from: 'FOYER',
      to: 'ATTIC',
      kind: 'PHYSICAL' as const,
      userInitiated: false,
    },
  ];

  it('rejects when no transition is requested', () => {
    const result = resolveTransition({
      currentNodeId: 'FOYER',
      requestedTransition: null,
      allowedOutgoingExits,
      activeFlags: [],
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('NO_MOVEMENT_REQUESTED');
    expect(result.toNodeId).toBe('FOYER');
  });

  it('accepts valid, accessible transition without requirements', () => {
    const result = resolveTransition({
      currentNodeId: 'FOYER',
      requestedTransition: 'LIBRARY',
      allowedOutgoingExits,
      activeFlags: [],
    });

    expect(result.accepted).toBe(true);
    expect(result.fromNodeId).toBe('FOYER');
    expect(result.toNodeId).toBe('LIBRARY');
    expect(result.reason).toBe('TRANSITION_ACCEPTED');
  });

  it('rejects transitions requiring unfulfilled flags', () => {
    const result = resolveTransition({
      currentNodeId: 'FOYER',
      requestedTransition: 'CELLAR',
      allowedOutgoingExits,
      activeFlags: [],
    });

    expect(result.accepted).toBe(false);
    expect(result.toNodeId).toBe('FOYER');
    expect(result.reason).toContain('UNSATISFIED_EDGE_REQUIREMENTS');
  });

  it('accepts transitions when required flags are present in activeFlags', () => {
    const result = resolveTransition({
      currentNodeId: 'FOYER',
      requestedTransition: 'CELLAR',
      allowedOutgoingExits,
      activeFlags: ['RUSTY_KEY'],
    });

    expect(result.accepted).toBe(true);
    expect(result.fromNodeId).toBe('FOYER');
    expect(result.toNodeId).toBe('CELLAR');
  });

  it('rejects transitions to non-connected or hallucinated nodes', () => {
    const result = resolveTransition({
      currentNodeId: 'FOYER',
      requestedTransition: 'SECRET_CHAMBER',
      allowedOutgoingExits,
      activeFlags: [],
    });

    expect(result.accepted).toBe(false);
    expect(result.toNodeId).toBe('FOYER');
    expect(result.reason).toBe('UNKNOWN_OR_UNCONNECTED_TARGET');
  });

  it('rejects transitions on edges that are not user-initiated', () => {
    const result = resolveTransition({
      currentNodeId: 'FOYER',
      requestedTransition: 'ATTIC',
      allowedOutgoingExits,
      activeFlags: [],
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('NON_USER_INITIATED_EDGE');
  });
});
