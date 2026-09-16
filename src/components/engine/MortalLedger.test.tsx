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
});
