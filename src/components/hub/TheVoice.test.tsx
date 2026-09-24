import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TheVoice from './TheVoice';
import { useVoiceStore } from '../../store/useVoiceStore';
import { useAppStore } from '../../store/useAppStore';

describe('TheVoice / The Historian Component', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    vi.restoreAllMocks();

    // Mock fetch for /api/ai/config
    vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/ai/config')) {
        return {
          ok: true,
          json: async () => ({
            voiceProvider: 'gemini',
            model: 'gemini-2.5-flash',
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    useVoiceStore.setState({
      messages: [
        {
          role: 'user',
          content: 'Inquire about the ritual cellar.',
          timestamp: 1000,
        },
        {
          role: 'voice',
          content: 'The cellar foundations whisper of forgotten rites beneath the bedrock.',
          timestamp: 2000,
        },
      ],
    });

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
    }
  });

  it('renders user-facing display strings for The Historian persona', async () => {
    await act(async () => {
      root?.render(<TheVoice />);
    });

    const content = container?.innerHTML || '';

    // Title banner
    expect(content).toContain('[ THE HISTORIAN // ORACLE OF RECORDS ]');

    // Message role labeling
    expect(content).toContain('CONDUCTOR');
    expect(content).toContain('THE HISTORIAN');
    expect(content).not.toContain('THE VOICE');

    // Textarea placeholder
    const textarea = container?.querySelector('textarea');
    expect(textarea?.getAttribute('placeholder')).toContain(
      'Commune with The Historian... (Shift+Enter for new line)'
    );

    // Send button
    expect(content).toContain('[ COMMUNE ]');
  });

  it('renders full-screen reading mode framed in an occult grimoire layout', async () => {
    await act(async () => {
      root?.render(<TheVoice isDocked={false} />);
    });

    // Grimoire folio wrapper constraints
    const folio = container?.querySelector('.max-w-4xl, .xl\\:max-w-5xl');
    expect(folio).not.toBeNull();
    expect(folio?.className).toContain('rounded-lg');
    expect(folio?.className).toContain('border-zinc-800');

    // Historian message prose formatting
    const historianMessage = container?.querySelector('.font-serif');
    expect(historianMessage).not.toBeNull();
  });

  it('renders docked mode without full-screen folio wrapper', async () => {
    await act(async () => {
      root?.render(<TheVoice isDocked={true} className="custom-docked-class" />);
    });

    const outerContainer = container?.firstElementChild as HTMLElement;
    expect(outerContainer?.className).toContain('custom-docked-class');
    expect(outerContainer?.className).toContain('h-full');
    expect(outerContainer?.className).toContain('w-full');
  });

  it('obeys the Prohibited Placeholder Guard policy (no forbidden surnames in output)', async () => {
    await act(async () => {
      root?.render(<TheVoice />);
    });

    const content = container?.innerHTML || '';
    expect(content).not.toMatch(/\bV[a]nce\b/i);
    expect(content).not.toMatch(/\bT[h]orne\b/i);
  });
});

describe('TheVoice — Live Telemetry Dispatch', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  const setTextareaValue = (textarea: HTMLTextAreaElement, val: string) => {
    const nativeValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;
    nativeValueSetter?.call(textarea, val);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  };

  beforeEach(() => {
    (globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    vi.restoreAllMocks();
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

  it('packages active simulation telemetry when engine session exists', async () => {
    (useAppStore.setState as unknown as (state: Record<string, unknown>) => void)({
      activeBlueprint: {
        title: 'The Black Iron Mortuary',
        topology: { nodes: [{ id: 'room-1', name: 'Cold Storage' }] },
        cast: [{ id: 'char-1', name: 'Dr. Holt' }],
      },
      activeSession: {
        currentChamberId: 'room-1',
        dramaturgyState: { macroPhase: 'EXPOSITION_BASELINE' },
        castPresence: { 'room-1': ['char-1'] },
        characterStatuses: { 'char-1': 'ALIVE' },
        clocks: [{ id: 'clk-1', name: 'Timer', value: 1, max: 3 }],
        manifestations: ['Cold chill'],
      },
    });

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/ai/config')) {
        return {
          ok: true,
          json: async () => ({
            voiceProvider: 'gemini',
            model: 'gemini-2.5-flash',
          }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ text: 'You are in Cold Storage with Dr. Holt.' }),
      } as Response;
    });

    await act(async () => {
      root?.render(<TheVoice />);
    });

    const textarea = container?.querySelector('textarea');
    expect(textarea).not.toBeNull();
    await act(async () => {
      setTextareaValue(textarea!, 'Where am I?');
    });

    const sendButton = container?.querySelector('button[title="Commune with The Historian"]') as HTMLButtonElement;
    expect(sendButton).not.toBeNull();
    await act(async () => {
      sendButton.click();
    });

    const voiceCall = fetchSpy.mock.calls.find((call) => String(call[0]).includes('/api/voice'));
    expect(voiceCall).toBeDefined();
    const body = JSON.parse(voiceCall![1]?.body as string);
    expect(body.engineTelemetry).toEqual({
      scenarioTitle: 'The Black Iron Mortuary',
      macroPhase: 'EXPOSITION_BASELINE',
      currentChamber: { id: 'room-1', name: 'Cold Storage' },
      coPresentCast: [{ id: 'char-1', name: 'Dr. Holt', status: 'ALIVE' }],
      activeClocks: [{ id: 'clk-1', name: 'Timer', value: 1, max: 3 }],
      manifestations: ['Cold chill'],
    });
  });

  it('sends undefined telemetry when no session is active', async () => {
    (useAppStore.setState as unknown as (state: Record<string, unknown>) => void)({ activeBlueprint: null, activeSession: null });

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/ai/config')) {
        return {
          ok: true,
          json: async () => ({
            voiceProvider: 'gemini',
            model: 'gemini-2.5-flash',
          }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ text: 'No scenario is active.' }),
      } as Response;
    });

    await act(async () => {
      root?.render(<TheVoice />);
    });

    const textarea = container?.querySelector('textarea');
    expect(textarea).not.toBeNull();
    await act(async () => {
      setTextareaValue(textarea!, 'Hello');
    });

    const sendButton = container?.querySelector('button[title="Commune with The Historian"]') as HTMLButtonElement;
    expect(sendButton).not.toBeNull();
    await act(async () => {
      sendButton.click();
    });

    const voiceCall = fetchSpy.mock.calls.find((call) => String(call[0]).includes('/api/voice'));
    expect(voiceCall).toBeDefined();
    const body = JSON.parse(voiceCall![1]?.body as string);
    expect(body.engineTelemetry).toBeUndefined();
  });
});
