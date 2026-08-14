import { describe, expect, it } from 'vitest';
import { buildEngineLogContent } from './download';

const messages = [
  {
    role: 'user',
    content: 'I test the latch.',
    timestamp: 1,
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
  },
  {
    role: 'user',
    content: 'I inspect the eastern seam.',
    timestamp: 3,
  },
];

describe('Engine telemetry export', () => {
  it('renders each stored user action once and places structured TTM logic between turns', () => {
    const output = buildEngineLogContent(
      messages,
      'html',
      'engine-telemetry',
      undefined,
      new Date('2026-08-14T09:03:49.626Z')
    );

    expect(output).not.toBeNull();
    const html = output!.content;

    expect(html.match(/<div class="user-input">/g)).toHaveLength(2);
    expect(html.match(/<details class="logic-panel">/g)).toHaveLength(1);
    expect(html).toContain(
      '[ TTM LOGIC // PHASE: LATENT // TENSION: 2 // INTENT: INSPECT // EXPANSION: FALSE ]'
    );
    expect(html).toContain('&quot;logic_state&quot;');
    expect(html).toContain('&quot;topologyDelta&quot;');
    expect(html).toContain('&quot;validation&quot;');

    const firstInput = html.indexOf('&gt; I test the latch.');
    const narrative = html.indexOf('The latch refuses to move.');
    const logicPanel = html.indexOf('<details class="logic-panel">');
    const nextInput = html.indexOf('&gt; I inspect the eastern seam.');

    expect(firstInput).toBeLessThan(narrative);
    expect(narrative).toBeLessThan(logicPanel);
    expect(logicPanel).toBeLessThan(nextInput);
  });

  it('includes the same structured decision record in Markdown exports', () => {
    const output = buildEngineLogContent(messages, 'md');

    expect(output).not.toBeNull();
    expect(output!.content).toContain('// TTM LOGIC');
    expect(output!.content).toContain('"current_phase": "LATENT"');
    expect(output!.content).toContain('"isExpansion": false');
  });
});
