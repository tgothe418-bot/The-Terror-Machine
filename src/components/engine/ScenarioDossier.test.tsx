import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import ScenarioDossier from './ScenarioDossier';

describe('ScenarioDossier Component (Occult Scrying Apparatus & Grimoire)', () => {
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

  it('renders scenario title, scale, setting location, atmosphere, and premise/blurb', () => {
    const mockBlueprint = {
      title: 'The Blackwood Sanatorium',
      scale: 'Tier IV',
      contentLevelDescription: 'Cosmic Dread',
      setting: {
        location: 'Blackwood Ridges',
        atmosphere: 'Sulfuric mist and dying spruce',
        timePeriod: '1924',
      },
      backCoverBlurb: 'An ancient grimoire discovered under the frozen foundations.',
    };

    act(() => {
      root?.render(<ScenarioDossier blueprint={mockBlueprint} />);
    });

    const titleEl = container?.querySelector('[data-testid="scenario-title"]');
    expect(titleEl?.textContent).toContain('The Blackwood Sanatorium');

    const scaleEl = container?.querySelector('[data-testid="scenario-scale"]');
    expect(scaleEl?.textContent).toContain('Tier IV');
    expect(scaleEl?.textContent).toContain('Cosmic Dread');

    const locationEl = container?.querySelector('[data-testid="scenario-location"]');
    expect(locationEl?.textContent).toContain('Blackwood Ridges');

    const atmosphereEl = container?.querySelector('[data-testid="scenario-atmosphere"]');
    expect(atmosphereEl?.textContent).toContain('Sulfuric mist and dying spruce');
    expect(atmosphereEl?.textContent).toContain('1924');

    const blurbEl = container?.querySelector('[data-testid="scenario-blurb"]');
    expect(blurbEl?.textContent).toContain('An ancient grimoire discovered under the frozen foundations.');
  });

  it('renders cover art image when coverImageUrl is provided', () => {
    const mockBlueprint = {
      title: 'The Sunken Cathedral',
      coverImageUrl: 'https://example.com/cathedral-cover.webp',
      setting: {
        location: 'Abyssal Trench',
        atmosphere: 'Cold briny depths',
      },
      premise: 'A submerged parish echoing with forgotten liturgy.',
    };

    act(() => {
      root?.render(<ScenarioDossier blueprint={mockBlueprint} />);
    });

    const coverContainer = container?.querySelector('[data-testid="scenario-cover-image-container"]');
    expect(coverContainer).not.toBeNull();
    expect(coverContainer?.className).toContain('max-h-24');
    expect(coverContainer?.className).toContain('h-24');

    const img = coverContainer?.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://example.com/cathedral-cover.webp');
    expect(img?.getAttribute('alt')).toBe('The Sunken Cathedral');

    const talisman = container?.querySelector('[data-testid="talisman-flourish"]');
    expect(talisman).toBeNull();
  });

  it('renders Austin Osman Spare sigil talisman flourish with compact emblem when no cover image is provided', () => {
    const mockBlueprint = {
      title: 'The Hollow Abbey',
      setting: {
        location: 'Moorlands',
        atmosphere: 'Heavy damp air',
      },
      premise: 'The stones remember what the monks tried to forget.',
    };

    act(() => {
      root?.render(<ScenarioDossier blueprint={mockBlueprint} />);
    });

    const coverContainer = container?.querySelector('[data-testid="scenario-cover-image-container"]');
    expect(coverContainer).toBeNull();

    const talisman = container?.querySelector('[data-testid="talisman-flourish"]');
    expect(talisman).not.toBeNull();
    expect(talisman?.className).toContain('max-h-24');
    expect(talisman?.className).toContain('h-24');
    expect(talisman?.textContent).toContain('Austin Osman Spare');
    expect(talisman?.textContent).toContain('SIGIL VEILED');

    const svg = talisman?.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('renders active engine telemetry and dynamic situation metrics', () => {
    const mockTelemetry = {
      tension: 'HIGH',
      pacing: 'RELENTLESS',
      currentPhase: 'ESCALATION',
      threatLevel: 'CRITICAL STRAIN',
      engineLogic: 'Pacing elevated due to cognitive strain and proximity.',
    };

    act(() => {
      root?.render(<ScenarioDossier telemetry={mockTelemetry} turnCount={7} />);
    });

    const situationEl = container?.querySelector('[data-testid="situation-metrics"]');
    expect(situationEl).not.toBeNull();

    const cycleEl = container?.querySelector('[data-testid="telemetry-cycle-counter"]');
    expect(cycleEl?.textContent).toContain('7');

    const tensionEl = container?.querySelector('[data-testid="telemetry-tension"]');
    expect(tensionEl?.textContent).toContain('HIGH');

    const pacingEl = container?.querySelector('[data-testid="telemetry-pacing"]');
    expect(pacingEl?.textContent).toContain('RELENTLESS');

    expect(situationEl?.textContent).toContain('CRITICAL STRAIN');
    expect(situationEl?.textContent).toContain('ESCALATION');

    const logicEl = container?.querySelector('[data-testid="telemetry-engine-logic"]');
    expect(logicEl?.textContent).toContain('Pacing elevated due to cognitive strain and proximity.');
  });

  it('renders active location display and character relationship summary', () => {
    const mockBlueprint = {
      title: 'The Whispering Vault',
      setting: {
        location: 'Subterranean Crypt',
        atmosphere: 'Stagnant dust and copper scent',
        timePeriod: '1888',
      },
      cast: [
        {
          id: 'char-1',
          name: 'Arthur Pendelton',
          role: 'Antiquarian',
          status: 'Composed',
          location: 'Outer Vestibule',
          relationships: ['Distrusts cultists'],
        },
        {
          id: 'char-2',
          name: 'Clara Oswald',
          role: 'Occult Archivist',
          status: 'Strained',
          location: 'Ritual Chamber',
        },
      ],
      relationships: [
        {
          sourceName: 'Arthur Pendelton',
          targetName: 'Clara Oswald',
          relation: 'Estranged Research Partners',
        },
      ],
    };

    act(() => {
      root?.render(
        <ScenarioDossier
          blueprint={mockBlueprint}
          activeLocation="Sealed Reliquary Vault"
        />
      );
    });

    const activeLocEl = container?.querySelector('[data-testid="active-location-display"]');
    expect(activeLocEl).not.toBeNull();
    expect(activeLocEl?.textContent).toContain('ACTIVE LOCATION:');
    expect(activeLocEl?.textContent).toContain('Sealed Reliquary Vault');

    const charSummaryEl = container?.querySelector('[data-testid="character-relationship-summary"]');
    expect(charSummaryEl).not.toBeNull();
    expect(charSummaryEl?.textContent).toContain('Arthur Pendelton');
    expect(charSummaryEl?.textContent).toContain('Antiquarian');
    expect(charSummaryEl?.textContent).toContain('Clara Oswald');
    expect(charSummaryEl?.textContent).toContain('Occult Archivist');
    expect(charSummaryEl?.textContent).toContain('Estranged Research Partners');
  });

  it('hides Horror Grammar Forensics behind an explicit toggle [ Show Diagnostic Ledger ]', () => {
    const mockForensics = {
      turnNumber: 4,
      preFictionalTime: { moment_revision: 3 },
      postFictionalTime: { moment_revision: 4 },
      presentOpportunityIds: ['OPP-CORRIDOR-01', 'OPP-STAIRS-02'],
      selectedOffscreenPursuitIds: ['PURSUIT-SHADOW-A'],
      activityEvidence: {
        disposition: 'ACCEPTED',
        reasonCode: 'TRANSITION_VERIFIED',
        castMemberId: 'char-elena',
        perceptionPath: 'DIRECT_SIGHT',
        activitySummary: 'Elena latched the iron shutter.',
        manifestationBlock: { content: 'Elena slammed the heavy iron bolt into place.' },
      },
      pressureEvidence: {
        disposition: 'REJECTED',
        reasonCode: 'TEMPORAL_WINDOW_EXPIRED',
        valueAnchorId: 'ANCHOR-SANCTITY',
        operator: 'ISOLATION_PRESSURE',
        adverseProspect: 'Barricade collapse imminent',
        manifestationBlock: { content: 'Splinters erupted from the rotted timbers.' },
      },
    };

    act(() => {
      root?.render(<ScenarioDossier latestForensicRecord={mockForensics} />);
    });

    // Forensics should be hidden initially behind toggle
    let forensicsContent = container?.querySelector('[data-testid="forensics-content"]');
    expect(forensicsContent).toBeNull();

    const toggleLedgerBtn = container?.querySelector(
      '[data-testid="toggle-diagnostic-ledger"]'
    ) as HTMLButtonElement;
    expect(toggleLedgerBtn).not.toBeNull();
    expect(toggleLedgerBtn.textContent).toContain('[ Show Diagnostic Ledger ]');

    // Click to show diagnostic ledger
    act(() => {
      toggleLedgerBtn.click();
    });

    expect(toggleLedgerBtn.textContent).toContain('[ Hide Diagnostic Ledger ]');
    forensicsContent = container?.querySelector('[data-testid="forensics-content"]');
    expect(forensicsContent).not.toBeNull();
    expect(forensicsContent?.textContent).toContain('Moment: 3 → 4');
    expect(forensicsContent?.textContent).toContain('OPP-CORRIDOR-01');
    expect(forensicsContent?.textContent).toContain('PURSUIT-SHADOW-A');

    // Verify initial open state for Activity Proposal Evidence
    let activityBody = container?.querySelector('[data-testid="activity-evidence-body"]');
    expect(activityBody).not.toBeNull();
    expect(activityBody?.textContent).toContain('TRANSITION_VERIFIED');
    expect(activityBody?.textContent).toContain('char-elena');
    expect(activityBody?.textContent).toContain('Elena latched the iron shutter.');
    expect(activityBody?.textContent).toContain('Elena slammed the heavy iron bolt into place.');

    // Verify initial open state for Situated Pressure Evidence
    let pressureBody = container?.querySelector('[data-testid="pressure-evidence-body"]');
    expect(pressureBody).not.toBeNull();
    expect(pressureBody?.textContent).toContain('TEMPORAL_WINDOW_EXPIRED');
    expect(pressureBody?.textContent).toContain('ANCHOR-SANCTITY');
    expect(pressureBody?.textContent).toContain('ISOLATION_PRESSURE');
    expect(pressureBody?.textContent).toContain('Barricade collapse imminent');
    expect(pressureBody?.textContent).toContain('Splinters erupted from the rotted timbers.');

    // Test collapsing Activity Proposal Evidence
    const toggleActivityBtn = container?.querySelector(
      '[data-testid="toggle-activity-evidence"]'
    ) as HTMLButtonElement;
    expect(toggleActivityBtn).not.toBeNull();

    act(() => {
      toggleActivityBtn.click();
    });

    activityBody = container?.querySelector('[data-testid="activity-evidence-body"]');
    expect(activityBody).toBeNull();

    // Re-expand Activity Proposal Evidence
    act(() => {
      toggleActivityBtn.click();
    });
    activityBody = container?.querySelector('[data-testid="activity-evidence-body"]');
    expect(activityBody).not.toBeNull();

    // Test collapsing Situated Pressure Evidence
    const togglePressureBtn = container?.querySelector(
      '[data-testid="toggle-pressure-evidence"]'
    ) as HTMLButtonElement;
    expect(togglePressureBtn).not.toBeNull();

    act(() => {
      togglePressureBtn.click();
    });

    pressureBody = container?.querySelector('[data-testid="pressure-evidence-body"]');
    expect(pressureBody).toBeNull();

    // Re-expand Situated Pressure Evidence
    act(() => {
      togglePressureBtn.click();
    });
    pressureBody = container?.querySelector('[data-testid="pressure-evidence-body"]');
    expect(pressureBody).not.toBeNull();

    // Hide diagnostic ledger again
    act(() => {
      toggleLedgerBtn.click();
    });
    expect(container?.querySelector('[data-testid="forensics-content"]')).toBeNull();
    expect(toggleLedgerBtn.textContent).toContain('[ Show Diagnostic Ledger ]');
  });

  it('renders placeholder when no latestForensicRecord is provided after opening ledger', () => {
    act(() => {
      root?.render(<ScenarioDossier latestForensicRecord={null} />);
    });

    // Initially hidden
    expect(container?.querySelector('[data-testid="forensics-empty"]')).toBeNull();

    const toggleLedgerBtn = container?.querySelector(
      '[data-testid="toggle-diagnostic-ledger"]'
    ) as HTMLButtonElement;
    expect(toggleLedgerBtn).not.toBeNull();

    act(() => {
      toggleLedgerBtn.click();
    });

    const emptyEl = container?.querySelector('[data-testid="forensics-empty"]');
    expect(emptyEl).not.toBeNull();
    expect(emptyEl?.textContent).toContain('Awaiting committed Horror Grammar turn telemetry...');
  });

  it('obeys the Prohibited Placeholder Guard policy (no forbidden surnames in output)', () => {
    const mockBlueprint = {
      title: 'The Blackwood Ritual',
      scale: 'Tier III',
      setting: {
        location: 'Desolate Fen',
        atmosphere: 'Choking damp and cold fog',
      },
      premise: 'A solitary lantern flickers on the boundary stone.',
    };

    act(() => {
      root?.render(
        <ScenarioDossier
          blueprint={mockBlueprint}
          telemetry={{ tension: 'LOW', pacing: 'CREEPING' }}
          turnCount={1}
        />
      );
    });

    const fullContent = container?.innerHTML || '';
    expect(fullContent).not.toMatch(/\bV[a]nce\b/i);
    expect(fullContent).not.toMatch(/\bT[h]orne\b/i);
  });
});
