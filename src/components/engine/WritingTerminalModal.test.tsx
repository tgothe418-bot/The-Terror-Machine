import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WritingTerminalModal from './WritingTerminalModal';

describe('WritingTerminalModal (Expanded Writing Terminal)', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
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

  it('renders initial value and character counter accurately', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();

    act(() => {
      root?.render(
        <WritingTerminalModal
          isOpen={true}
          title="Terminal Test"
          fieldLabel="Premise"
          initialValue="Atmospheric Station Beta"
          maxLength={100}
          onApply={onApply}
          onClose={onClose}
        />
      );
    });

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    expect(textarea.value).toBe('Atmospheric Station Beta');

    const counter = document.body.textContent;
    expect(counter).toContain('24 / 100');
  });

  it('preserves multi-line text and line breaks upon Apply', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    const multiLineInput = 'Line 1: Dark Corridor\nLine 2: Rusted Door\n\nLine 3: Terminal Node';

    act(() => {
      root?.render(
        <WritingTerminalModal
          isOpen={true}
          title="Terminal Test"
          fieldLabel="Authority Scope"
          initialValue={multiLineInput}
          maxLength={500}
          onApply={onApply}
          onClose={onClose}
        />
      );
    });

    const applyButton = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Apply Changes')
    ) as HTMLButtonElement;

    expect(applyButton).toBeDefined();
    expect(applyButton.disabled).toBe(false);

    act(() => {
      applyButton.click();
    });

    expect(onApply).toHaveBeenCalledWith(multiLineInput);
    expect(onClose).toHaveBeenCalled();
  });

  it('discards unapplied draft on Cancel without calling onApply', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();

    act(() => {
      root?.render(
        <WritingTerminalModal
          isOpen={true}
          title="Terminal Test"
          fieldLabel="Operational Limits"
          initialValue="Initial Limit"
          maxLength={200}
          onApply={onApply}
          onClose={onClose}
        />
      );
    });

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    act(() => {
      // Simulate editing
      textarea.value = 'Modified draft that should be discarded';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const cancelButton = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Cancel')
    ) as HTMLButtonElement;

    act(() => {
      cancelButton.click();
    });

    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape key press without applying changes', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();

    act(() => {
      root?.render(
        <WritingTerminalModal
          isOpen={true}
          title="Terminal Test"
          fieldLabel="Director Focus"
          initialValue="Focus prompt"
          maxLength={200}
          onApply={onApply}
          onClose={onClose}
        />
      );
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('disables Apply button when draft exceeds maxLength limit', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    const longString = 'A'.repeat(55);

    act(() => {
      root?.render(
        <WritingTerminalModal
          isOpen={true}
          title="Terminal Test"
          fieldLabel="Place Seed"
          initialValue={longString}
          maxLength={50}
          onApply={onApply}
          onClose={onClose}
        />
      );
    });

    const applyButton = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Apply Changes')
    ) as HTMLButtonElement;

    expect(applyButton.disabled).toBe(true);

    act(() => {
      applyButton.click();
    });

    expect(onApply).not.toHaveBeenCalled();
  });
});
