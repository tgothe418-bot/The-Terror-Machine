import { describe, expect, it } from 'vitest';
import { buildEngineLogContent, generateTelemetryFilename } from './download';

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
    expect(md).toContain('// TTM LOGIC');
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
        },
      },
    ];

    const htmlOutput = buildEngineLogContent(messagesWithCastReceipt, 'html', 'continuity-test');
    expect(htmlOutput).not.toBeNull();
    const html = htmlOutput!.content;

    expect(html).toContain('CAST CONTINUITY: 2');
    expect(html).toContain('&quot;castContinuityReceipt&quot;');
    expect(html).toContain('&quot;char-1&quot;');
    expect(html).toContain('&quot;char-2&quot;');
    expect(html).toContain('&quot;skepticism&quot;: 0.7');
    expect(html).toContain('&quot;skepticism_delta&quot;: 0.1');

    const mdOutput = buildEngineLogContent(messagesWithCastReceipt, 'md', 'continuity-test');
    expect(mdOutput).not.toBeNull();
    const md = mdOutput!.content;

    expect(md).toContain('"castContinuityReceipt"');
    expect(md).toContain('"char-1"');
    expect(md).toContain('"char-2"');
    expect(md).toContain('"skepticism": 0.7');
    expect(md).toContain('"skepticism_delta": 0.1');
  });

  it('does not display CAST CONTINUITY in HTML summary when castContinuityReceipt is not present', () => {
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
  });
});
