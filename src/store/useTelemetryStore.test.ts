import { describe, it, expect, beforeEach } from 'vitest';
import { useTelemetryStore } from './useTelemetryStore';

describe('useTelemetryStore', () => {
  beforeEach(() => {
    useTelemetryStore.setState({
      turnCount: 1,
      currentPhase: 'LATENT',
      rollingWindow: [],
    });
  });

  it('initializes with default telemetry state', () => {
    const state = useTelemetryStore.getState();
    expect(state.turnCount).toBe(1);
    expect(state.currentPhase).toBe('LATENT');
    expect(state.rollingWindow).toEqual([]);
    expect(state.getMomentumIndex()).toBe(0.5);
  });

  it('records turn and calculates momentum index cleanly', () => {
    const store = useTelemetryStore.getState();
    store.recordTurn({
      inputLength: 100,
      semanticUrgency: 0.8,
      sanityDelta: -2,
    });

    const updated = useTelemetryStore.getState();
    expect(updated.turnCount).toBe(2);
    expect(updated.rollingWindow).toHaveLength(1);
    expect(updated.getMomentumIndex()).toBeGreaterThan(0);
  });
});
