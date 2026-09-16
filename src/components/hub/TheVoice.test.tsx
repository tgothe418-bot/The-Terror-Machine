import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TheVoice from './TheVoice';
import { useVoiceStore } from '../../store/useVoiceStore';

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
