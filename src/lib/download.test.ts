import { describe, expect, it } from 'vitest';
import { buildEngineLogContent } from './download';

const mockReceipt = {
  version: 1,
  scenarioTitle: 'The Cold Room',
  blueprintId: 'bp-101',
  selectedRole: 'protagonist',
  resolvedPlayerName: 'Marcus Vance',
  resolvedPlayerId: 'char-marcus',
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
    userCharacterName: 'Marcus Vance',
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
    userCharacterName: 'Marcus Vance',
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
    expect(html).toContain('Marcus Vance');
    expect(html).toContain('VAULT_01');

    // Verify user label
    expect(html).toContain('[ USER: Marcus Vance ]');

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
    expect(md).toContain('**Bound Player:** Marcus Vance');
    expect(md).toContain('**[ USER: Marcus Vance ]**');
    expect(md).toContain('// TTM LOGIC');
    expect(md).toContain('"current_phase": "LATENT"');
    expect(md).toContain('"isExpansion": false');
  });
});
