import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MortalLedger from './MortalLedger';

describe('MortalLedger Component (Occult Vessel Matrix)', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root && container) {
      act(() => {
        root?.unmount();
      });
      container.remove();
      container = null;
      root = null;
    }
  });

  it('renders player character name, role category badge, and psychological status', () => {
    act(() => {
      root?.render(
        <MortalLedger
          playerCharacterName="Evelyn Cross"
          playerRoleCategory="SURVIVOR"
          psychologicalStatus="Paranoid Tremor"
          injuries={['Sprained ankle']}
          inventory={['Brass Key', 'Tallow Candle']}
        />
      );
    });

    expect(container?.querySelector('[data-testid="player-character-name"]')?.textContent).toContain('Evelyn Cross');
    expect(container?.querySelector('[data-testid="player-role-badge"]')?.textContent).toContain('SURVIVOR');
    expect(container?.querySelector('[data-testid="psychological-status"]')?.textContent).toContain('Paranoid Tremor');
    expect(container?.textContent).toContain('Sprained ankle');
    expect(container?.textContent).toContain('Brass Key');
    expect(container?.textContent).toContain('Tallow Candle');
  });

  it('renders empty fallback states for injuries, inventory, and cohort', () => {
    act(() => {
      root?.render(
        <MortalLedger
          playerCharacterName="Julian Gray"
          playerRoleCategory="BYSTANDER"
          injuries={[]}
          inventory={[]}
          castMembers={[]}
        />
      );
    });

    expect(container?.querySelector('[data-testid="empty-injuries"]')?.textContent).toContain('Unharmed; flesh intact');
    expect(container?.querySelector('[data-testid="empty-inventory"]')?.textContent).toContain('No physical relics carried');
    expect(container?.querySelector('[data-testid="empty-cast"]')?.textContent).toContain('No companion vessels tracked in this realm.');
  });

  it('renders pure-text cohort members without any image tags or avatar circles', () => {
    const cast = [
      {
        id: 'char-1',
        name: 'Father Mercer',
        role: 'Occult Scholar',
        location: 'Ossuary Archives',
        psychological_status: 'Devout dread',
        skepticism: 4,
      },
      {
        id: 'char-2',
        name: 'Clara Reed',
        role: 'Skeptic Medic',
        location: 'Crypt Threshold',
        psychological_status: 'Hyper-vigilant',
        skepticism: 8,
      },
    ];

    act(() => {
      root?.render(
        <MortalLedger
          playerCharacterName="Julian Gray"
          castMembers={cast}
        />
      );
    });

    expect(container?.textContent).toContain('Father Mercer');
    expect(container?.textContent).toContain('Occult Scholar');
    expect(container?.textContent).toContain('Clara Reed');
    expect(container?.textContent).toContain('Skeptic Medic');

    // Verify ZERO <img> or portrait placeholder circles exist
    const imgTags = container?.querySelectorAll('img') || [];
    expect(imgTags.length).toBe(0);
  });

  it('renders impending clocks with literary manifestation cues and diegetic instrument carve-out', () => {
    const clocks = [
      {
        id: 'clock-containment',
        name: 'Containment Core Decay',
        currentLevel: 2,
        maxLevel: 4,
        advanceMode: 'TIME' as const,
        manifestationCues: [
          { atLevel: 1, cue: 'A faint mechanical thrum vibrates through the deck plating.' },
          { atLevel: 2, cue: 'Warning klaxons beep at low volume; exhaust smells of burning ozone.' },
        ],
        diegeticInstrument: 'Coolant Pressure Dial',
        instrumentNodeId: 'node-generator-room',
        isTripped: false,
      },
      {
        id: 'clock-hull',
        name: 'Hull Breach Strain',
        currentLevel: 1,
        maxLevel: 3,
        advanceMode: 'TIME' as const,
        manifestationCues: [
          { atLevel: 1, cue: 'Moaning rivets pop from the bulkheads.' },
        ],
        isTripped: false,
      },
    ];

    // Case 1: Situated at node-generator-room -> coolant dial visible
    act(() => {
      root?.render(
        <MortalLedger
          playerCharacterName="Dr. Ross"
          impendingClocks={clocks}
          currentLocationNodeId="node-generator-room"
          macroPhase="ESCALATING_VISE"
          pacingCadence="RATCHET_TENSION"
        />
      );
    });

    expect(container?.querySelector('[data-testid="mortal-ledger-pacing-bar"]')?.textContent).toContain('ESCALATING VISE');
    expect(container?.querySelector('[data-testid="mortal-ledger-pacing-bar"]')?.textContent).toContain('RATCHET TENSION');
    expect(container?.textContent).toContain('Containment Core Decay');
    expect(container?.textContent).toContain('Warning klaxons beep at low volume; exhaust smells of burning ozone.');
    expect(container?.querySelector('[data-testid="diegetic-gauge-clock-containment"]')?.textContent).toContain('Coolant Pressure Dial: 2/4');

    // Hull Breach Strain has no diegeticInstrument, should show only manifestation prose
    expect(container?.textContent).toContain('Hull Breach Strain');
    expect(container?.textContent).toContain('Moaning rivets pop from the bulkheads.');
    expect(container?.querySelector('[data-testid="diegetic-gauge-clock-hull"]')).toBeNull();

    // Case 2: Situated elsewhere -> instrument situated elsewhere text, no numeric gauge
    act(() => {
      root?.render(
        <MortalLedger
          playerCharacterName="Dr. Ross"
          impendingClocks={clocks}
          currentLocationNodeId="node-corridor-alpha"
        />
      );
    });

    expect(container?.querySelector('[data-testid="diegetic-gauge-clock-containment"]')).toBeNull();
    expect(container?.textContent).toContain('Instrument situated elsewhere');
  });

  it('renders obstruction refusal badge when companion is obstructed at breaking point', () => {
    const cast = [
      {
        id: 'char-park',
        name: 'Officer Park',
        role: 'Security Detail',
        location: 'Airlock Pre-Chamber',
        psychological_status: 'Terrified Panicked',
        currentComposure: 15,
        isObstructed: true,
        obstructionReason: 'Refuses to enter the airlock after witnessing the severed umbilical',
      },
    ];

    act(() => {
      root?.render(
        <MortalLedger
          playerCharacterName="Dr. Ross"
          castMembers={cast}
        />
      );
    });

    const badge = container?.querySelector('[data-testid="obstruction-badge-char-park"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('OBSTRUCTED: Refuses to enter the airlock after witnessing the severed umbilical');
    expect(container?.textContent).toContain('COMPOSURE:');
    expect(container?.textContent).toContain('15/100');
  });
});
