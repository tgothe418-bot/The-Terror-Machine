import { describe, expect, it } from 'vitest';
import { buildEngineLogContent, generateTelemetryFilename, buildCanonicalStateDiff } from './download';
import type { RuntimeStateSnapshot } from '../types';

const mockReceipt = {
  version: 1,
  scenarioTitle: 'The Cold Room',
  blueprintId: 'bp-101',
  selectedRole: 'protagonist',
  resolvedPlayerName: 'Field Operative',
  resolvedPlayerId: 'char-field-op',
  currentNodeId: 'VAULT_01',
  readableNodeLabel: 'Vault 01',
  activeVector: 'COGNITIVE',
  activeTier: 'LATENT',
  castCount: 3,
  worldRuleCount: 2,
  topologyNodeCount: 4,
  topologyConnectionCount: 3,
};

const messages = [
  {
    role: 'user',
    content: 'I test the latch.',
    timestamp: 1,
    userCharacterName: 'Field Operative',
  },
  {
    role: 'assistant',
    content: 'The latch refuses to move.',
    timestamp: 2,
    blocks: [{ type: 'prose', content: 'The latch refuses to move.' }],
    logic_state: {
      current_phase: 'LATENT',
      suggested_tension: 2,
      intent_classification: 'INSPECT',
      terminal_flags: [],
    },
    topologyDelta: { isExpansion: false },
    validation: { accepted: true },
    contextReceipt: mockReceipt,
  },
  {
    role: 'user',
    content: 'I inspect the eastern seam.',
    timestamp: 3,
    userCharacterName: 'Field Operative',
  },
];

describe('Engine telemetry export', () => {
  it('renders Context Receipt exactly once at top of HTML export and user input labels', () => {
    const output = buildEngineLogContent(
      messages,
      'html',
      'engine-telemetry',
      undefined,
      new Date('2026-08-14T09:03:49.626Z')
    );

    expect(output).not.toBeNull();
    const html = output!.content;

    // Verify Context Receipt block is present exactly once
    expect(html.match(/class="context-receipt"/g)).toHaveLength(1);
    expect(html).toContain('[ CONTEXT RECEIPT // SCENARIO BINDING v1 ]');
    expect(html).toContain('The Cold Room');
    expect(html).toContain('Field Operative');
    expect(html).toContain('VAULT_01');

    // Verify user label
    expect(html).toContain('[ USER: Field Operative ]');

    // Verify user turns and logic panel
    expect(html.match(/<div class="user-input">/g)).toHaveLength(2);
    expect(html.match(/<details class="logic-panel">/g)).toHaveLength(1);
    expect(html).toContain(
      '[ TTM LOGIC // PHASE: LATENT // TENSION: 2 // INTENT: INSPECT // EXPANSION: FALSE ]'
    );
    expect(html).toContain('&quot;logic_state&quot;');
    expect(html).toContain('&quot;topologyDelta&quot;');
    expect(html).toContain('&quot;validation&quot;');

    const receiptPos = html.indexOf('class="context-receipt"');
    const firstInput = html.indexOf('&gt; I test the latch.');
    const narrative = html.indexOf('The latch refuses to move.');
    const logicPanel = html.indexOf('<details class="logic-panel">');
    const nextInput = html.indexOf('&gt; I inspect the eastern seam.');

    expect(receiptPos).toBeLessThan(firstInput);
    expect(firstInput).toBeLessThan(narrative);
    expect(narrative).toBeLessThan(logicPanel);
    expect(logicPanel).toBeLessThan(nextInput);
  });

  it('includes Context Receipt and structured decision records in Markdown exports', () => {
    const output = buildEngineLogContent(messages, 'md');

    expect(output).not.toBeNull();
    const md = output!.content;

    expect(md).toContain('### [ CONTEXT RECEIPT // SCENARIO BINDING v1 ]');
    expect(md).toContain('**Scenario:** The Cold Room (bp-101)');
    expect(md).toContain('**Bound Player:** Field Operative');
    expect(md).toContain('**[ USER: Field Operative ]**');
    expect(md).toContain('#### Intent & Pressure');
    expect(md).toContain('#### Intent Synergy');
    expect(md).toContain('#### Narrative Reconciliation');
    expect(md).toContain('#### Canonical State Diff');
    expect(md).toContain('#### Schema Repairs and Validation');
    expect(md).toContain('#### Raw Structured Payload');
    expect(md).toContain('"current_phase": "LATENT"');
    expect(md).toContain('"isExpansion": false');
  });

  it('includes turn receipt with pre/post snapshots in both HTML and Markdown telemetry exports', () => {
    const messagesWithSnapshots = [
      {
        role: 'user',
        content: 'Step through the archway',
        timestamp: 10,
        userCharacterName: 'Field Operative',
      },
      {
        role: 'assistant',
        content: 'The cold geometry shifts around you.',
        timestamp: 11,
        blocks: [{ type: 'prose', content: 'The cold geometry shifts around you.' }],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 40,
        },
        turnReceipt: {
          turnNumber: 2,
          nodeBefore: 'VAULT_01',
          requestedTarget: 'VAULT_02',
          accepted: true,
          nodeAfter: 'VAULT_02',
          activeVector: 'COSMIC',
          activeTier: 'MANIFEST',
          tension: 40,
          preSnapshot: {
            version: 1,
            turnCount: 1,
            currentNodeId: 'VAULT_01',
            activeVector: 'COGNITIVE',
            activeTier: 'LATENT',
            phase: 'LATENT',
            tension: 10,
            coherence: 1.0,
            reconciliationRevision: 0,
            activeFlags: ['FLAG_OBSERVED'],
          },
          postSnapshot: {
            version: 1,
            turnCount: 2,
            currentNodeId: 'VAULT_02',
            activeVector: 'COSMIC',
            activeTier: 'MANIFEST',
            phase: 'MANIFEST',
            tension: 40,
            coherence: 0.9,
            reconciliationRevision: 0,
            activeFlags: ['FLAG_OBSERVED', 'FLAG_ARCHWAY_CROSSED'],
          },
        },
      },
    ];

    const htmlOutput = buildEngineLogContent(messagesWithSnapshots, 'html', 'snapshot-test');
    expect(htmlOutput).not.toBeNull();
    const html = htmlOutput!.content;

    expect(html).toContain('&quot;turnReceipt&quot;');
    expect(html).toContain('&quot;preSnapshot&quot;');
    expect(html).toContain('&quot;postSnapshot&quot;');
    expect(html).toContain('&quot;activeVector&quot;: &quot;COSMIC&quot;');
    expect(html).toContain('&quot;FLAG_ARCHWAY_CROSSED&quot;');

    const mdOutput = buildEngineLogContent(messagesWithSnapshots, 'md', 'snapshot-test');
    expect(mdOutput).not.toBeNull();
    const md = mdOutput!.content;

    expect(md).toContain('"turnReceipt"');
    expect(md).toContain('"preSnapshot"');
    expect(md).toContain('"postSnapshot"');
    expect(md).toContain('"activeVector": "COSMIC"');
    expect(md).toContain('"activeTier": "MANIFEST"');
    expect(md).toContain('FLAG_ARCHWAY_CROSSED');
  });

  it('generates standardized structured telemetry export filenames', () => {
    const filenameHtml = generateTelemetryFilename(
      'The Drowned Bell',
      'antagonist-bellkeeper',
      new Date('2026-08-16T14:30:00Z'),
      'html'
    );
    expect(filenameHtml).toBe('the-drowned-bell_antagonist-bellkeeper_2026-08-16.html');

    const filenameMd = generateTelemetryFilename(
      'Submerged Echo Chamber',
      'protagonist',
      new Date('2026-08-16T00:00:00Z'),
      'md'
    );
    expect(filenameMd).toBe('submerged-echo-chamber_protagonist_2026-08-16.md');

    const fallback = generateTelemetryFilename(undefined, undefined, new Date('2026-08-16T00:00:00Z'));
    expect(fallback).toBe('scenario_session_2026-08-16.html');
  });

  it('includes castContinuityReceipt in Markdown and HTML exports and shows CAST CONTINUITY count in summary', () => {
    const messagesWithCastReceipt = [
      {
        role: 'user',
        content: 'Action text',
        timestamp: 10,
        userCharacterName: 'Player 1',
      },
      {
        role: 'assistant',
        content: 'Narrative response.',
        timestamp: 11,
        blocks: [{ type: 'prose', content: 'Narrative response.' }],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 25,
        },
        turnReceipt: {
          turnNumber: 1,
          nodeBefore: 'NODE_1',
          requestedTarget: 'NODE_2',
          accepted: true,
          nodeAfter: 'NODE_2',
          activeVector: 'COGNITIVE',
          activeTier: 'LATENT',
          tension: 25,
          preSnapshot: {
            version: 1,
            turnCount: 0,
            currentNodeId: 'NODE_1',
            activeVector: 'COGNITIVE',
            activeTier: 'LATENT',
            phase: 'LATENT',
            tension: 10,
            coherence: 1.0,
            reconciliationRevision: 0,
            activeFlags: [],
          },
          castContinuityReceipt: {
            version: 1,
            state: {
              'char-1': { skepticism: 0.7 },
              'char-2': { skepticism: 0.4 },
            },
            acceptedDeltas: [
              { character_id: 'char-1', skepticism_delta: 0.1 },
            ],
          },
          castPresenceReceipt: {
            version: 1,
            state: {
              'char-1': { nodeId: 'NODE_2' },
              'char-2': { nodeId: 'NODE_1' },
            },
          },
        },
      },
    ];

    const htmlOutput = buildEngineLogContent(messagesWithCastReceipt, 'html', 'continuity-test');
    expect(htmlOutput).not.toBeNull();
    const html = htmlOutput!.content;

    expect(html).toContain('CAST CONTINUITY: 2');
    expect(html).toContain('CAST PRESENCE: 2');
    expect(html).toContain('&quot;castContinuityReceipt&quot;');
    expect(html).toContain('&quot;castPresenceReceipt&quot;');
    expect(html).toContain('&quot;char-1&quot;');
    expect(html).toContain('&quot;char-2&quot;');
    expect(html).toContain('&quot;skepticism&quot;: 0.7');
    expect(html).toContain('&quot;skepticism_delta&quot;: 0.1');
    expect(html).toContain('&quot;nodeId&quot;: &quot;NODE_2&quot;');

    const mdOutput = buildEngineLogContent(messagesWithCastReceipt, 'md', 'continuity-test');
    expect(mdOutput).not.toBeNull();
    const md = mdOutput!.content;

    expect(md).toContain('"castContinuityReceipt"');
    expect(md).toContain('"castPresenceReceipt"');
    expect(md).toContain('"char-1"');
    expect(md).toContain('"char-2"');
    expect(md).toContain('"skepticism": 0.7');
    expect(md).toContain('"skepticism_delta": 0.1');
    expect(md).toContain('"nodeId": "NODE_2"');
  });

  it('does not display CAST CONTINUITY or CAST PRESENCE in HTML summary when receipts are not present', () => {
    const messagesWithoutReceipt = [
      {
        role: 'user',
        content: 'Action text',
        timestamp: 10,
      },
      {
        role: 'assistant',
        content: 'Narrative response.',
        timestamp: 11,
        blocks: [{ type: 'prose', content: 'Narrative response.' }],
        logic_state: {
          current_phase: 'MANIFEST',
        },
      },
    ];

    const htmlOutput = buildEngineLogContent(messagesWithoutReceipt, 'html', 'no-receipt-test');
    expect(htmlOutput).not.toBeNull();
    expect(htmlOutput!.content).not.toContain('CAST CONTINUITY');
    expect(htmlOutput!.content).not.toContain('CAST PRESENCE');
  });

  describe('buildCanonicalStateDiff helper', () => {
    it('returns diff unavailable when snapshots are missing', () => {
      expect(buildCanonicalStateDiff(undefined, undefined)).toEqual(['Canonical snapshot diff unavailable.']);
    });

    it('returns no changes message when snapshots are identical', () => {
      const snap: RuntimeStateSnapshot = {
        version: 1,
        turnCount: 1,
        currentNodeId: 'NODE_A',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        phase: 'LATENT',
        tension: 10,
        coherence: 1.0,
        reconciliationRevision: 0,
        activeFlags: ['FLAG_1'],
      };
      expect(buildCanonicalStateDiff(snap, snap)).toEqual(['No canonical snapshot changes.']);
    });

    it('reports scalar mutations and added/removed activeFlags', () => {
      const pre: RuntimeStateSnapshot = {
        version: 1,
        turnCount: 1,
        currentNodeId: 'NODE_A',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        phase: 'LATENT',
        tension: 10,
        coherence: 1.0,
        reconciliationRevision: 0,
        activeFlags: ['FLAG_OLD', 'FLAG_PERSIST'],
      };
      const post: RuntimeStateSnapshot = {
        version: 1,
        turnCount: 2,
        currentNodeId: 'NODE_B',
        activeVector: 'COSMIC',
        activeTier: 'MANIFEST',
        phase: 'MANIFEST',
        tension: 35,
        coherence: 0.85,
        reconciliationRevision: 1,
        activeFlags: ['FLAG_PERSIST', 'FLAG_NEW'],
      };

      const diff = buildCanonicalStateDiff(pre, post);
      expect(diff).toContain('TURN COUNT: 1 → 2');
      expect(diff).toContain('CURRENT NODE: NODE_A → NODE_B');
      expect(diff).toContain('ACTIVE VECTOR: COGNITIVE → COSMIC');
      expect(diff).toContain('ACTIVE TIER: LATENT → MANIFEST');
      expect(diff).toContain('PHASE: LATENT → MANIFEST');
      expect(diff).toContain('TENSION: 10 → 35');
      expect(diff).toContain('COHERENCE: 1 → 0.85');
      expect(diff).toContain('RECONCILIATION REVISION: 0 → 1');
      expect(diff).toContain('ACTIVE FLAGS ADDED: FLAG_NEW');
      expect(diff).toContain('ACTIVE FLAGS REMOVED: FLAG_OLD');
    });
  });

  it('renders IntentReceipt and NarrativeReconciliationReceipt in both HTML and Markdown exports (Phase 3G.1D)', () => {
    const messagesWith3G1DReceipts = [
      {
        role: 'user',
        content: 'I examine the ancient altar.',
        timestamp: 100,
        userCharacterName: 'Investigator',
      },
      {
        role: 'assistant',
        content: 'The runes pulse faintly under your trembling fingertips.',
        timestamp: 101,
        blocks: [{ type: 'prose', content: 'The runes pulse faintly under your trembling fingertips.' }],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 30,
        },
        turnReceipt: {
          turnNumber: 3,
          nodeBefore: 'NODE_CHAMBER',
          requestedTarget: 'NODE_ALTAR',
          accepted: true,
          nodeAfter: 'NODE_ALTAR',
          activeVector: 'COGNITIVE',
          activeTier: 'MANIFEST',
          tension: 30,
          preSnapshot: {
            version: 1,
            turnCount: 2,
            currentNodeId: 'NODE_CHAMBER',
            activeVector: 'COGNITIVE',
            activeTier: 'LATENT',
            phase: 'LATENT',
            tension: 20,
            coherence: 1.0,
            reconciliationRevision: 0,
            activeFlags: [],
          },
          postSnapshot: {
            version: 1,
            turnCount: 3,
            currentNodeId: 'NODE_ALTAR',
            activeVector: 'COGNITIVE',
            activeTier: 'MANIFEST',
            phase: 'MANIFEST',
            tension: 30,
            coherence: 0.9,
            reconciliationRevision: 1,
            activeFlags: ['FLAG_ALTAR_TOUCHED'],
          },
          intentReceipt: {
            version: 1,
            action_kind: 'examine',
            action_subtype: 'sensory',
            pressure_direction: 'inward',
            dramatic_tactic: 'scrutinize',
            intent_synergy: 'SUCCESS',
          },
          narrativeReconciliationReceipt: {
            version: 1,
            mode: 'harmonize',
            feasibility: 'plausible',
            reason_code: 'DIRECT_ACCESS',
            fictional_time_cost: 'instantaneous',
            authority_alignment: 'aligned',
            memory_echo_candidate: 'The altar was cold and vibrating with low resonance.',
          },
          castInteractionReceipt: {
            outcome: 'dialogue_progressed',
            addressedCharacterId: 'char-cultist',
            respondingCharacterId: 'char-cultist',
          },
        },
      },
    ];

    const htmlOutput = buildEngineLogContent(messagesWith3G1DReceipts, 'html', '3g1d-test');
    expect(htmlOutput).not.toBeNull();
    const html = htmlOutput!.content;

    // Header summary tests
    expect(html).toContain('INTENT: EXAMINE/SENSORY');
    expect(html).toContain('PRESSURE: INWARD');
    expect(html).toContain('SYNERGY: SUCCESS');
    expect(html).toContain('RECONCILIATION: HARMONIZE');

    // Section header tests
    expect(html).toContain('<h4>Intent &amp; Pressure</h4>');
    expect(html).toContain('<li><strong>Action Kind:</strong> examine</li>');
    expect(html).toContain('<li><strong>Action Subtype:</strong> sensory</li>');
    expect(html).toContain('<li><strong>Pressure Direction:</strong> inward</li>');
    expect(html).toContain('<li><strong>Dramatic Tactic:</strong> scrutinize</li>');

    expect(html).toContain('<h4>Intent Synergy</h4>');
    expect(html).toContain('<li><strong>Synergy:</strong> SUCCESS</li>');
    expect(html).toContain('Intent–state coherence; not action outcome.');

    expect(html).toContain('<h4>Narrative Reconciliation</h4>');
    expect(html).toContain('<li><strong>Mode:</strong> harmonize</li>');
    expect(html).toContain('<li><strong>Feasibility:</strong> plausible</li>');
    expect(html).toContain('<li><strong>Reason Code:</strong> DIRECT_ACCESS</li>');
    expect(html).toContain('<li><strong>Fictional Time Cost:</strong> instantaneous</li>');
    expect(html).toContain('<li><strong>Authority Alignment:</strong> aligned</li>');

    expect(html).toContain('<h4>Canonical State Diff</h4>');
    expect(html).toContain('<li>CURRENT NODE: NODE_CHAMBER → NODE_ALTAR</li>');
    expect(html).toContain('<li>ACTIVE FLAGS ADDED: FLAG_ALTAR_TOUCHED</li>');

    expect(html).toContain('<h4>Cast Presence &amp; Interaction</h4>');
    expect(html).toContain('<li><strong>Outcome:</strong> dialogue_progressed</li>');
    expect(html).toContain('<li><strong>Addressed Character ID:</strong> char-cultist</li>');

    expect(html).toContain('<h4>Continuity / Memory Candidates</h4>');
    expect(html).toContain('<li><strong>Memory Echo Candidate:</strong> The altar was cold and vibrating with low resonance.</li>');

    // Markdown tests
    const mdOutput = buildEngineLogContent(messagesWith3G1DReceipts, 'md', '3g1d-test');
    expect(mdOutput).not.toBeNull();
    const md = mdOutput!.content;

    expect(md).toContain('#### Intent & Pressure');
    expect(md).toContain('- **Action Kind:** examine');
    expect(md).toContain('- **Action Subtype:** sensory');
    expect(md).toContain('- **Pressure Direction:** inward');
    expect(md).toContain('- **Dramatic Tactic:** scrutinize');

    expect(md).toContain('#### Intent Synergy');
    expect(md).toContain('- **Synergy:** SUCCESS');

    expect(md).toContain('#### Narrative Reconciliation');
    expect(md).toContain('- **Mode:** harmonize');
    expect(md).toContain('- **Feasibility:** plausible');
    expect(md).toContain('- **Reason Code:** DIRECT_ACCESS');

    expect(md).toContain('#### Canonical State Diff');
    expect(md).toContain('- CURRENT NODE: NODE_CHAMBER → NODE_ALTAR');
    expect(md).toContain('- ACTIVE FLAGS ADDED: FLAG_ALTAR_TOUCHED');

    expect(md).toContain('#### Continuity / Memory Candidates');
    expect(md).toContain('- **Memory Echo Candidate:** The altar was cold and vibrating with low resonance.');
  });
});
