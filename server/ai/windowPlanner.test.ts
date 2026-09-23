import { describe, it, expect } from 'vitest';
import { planSweepWindows } from './windowPlanner';

describe('planSweepWindows', () => {
  it('creates single W1/1 window for short text', () => {
    const shortText = 'The cellar is cold. Dr. Holt waits.';
    const windows = planSweepWindows(shortText, 3800, 200);
    expect(windows).toHaveLength(1);
    expect(windows[0].windowIndex).toBe(0);
    expect(windows[0].windowCount).toBe(1);
    expect(windows[0].text).toBe(shortText);
    expect(windows[0].sourceRange).toEqual({ start: 0, end: shortText.length });
    expect(windows[0].tokenRange.start).toBe(0);
    expect(windows[0].tokenRange.end).toBeGreaterThan(0);
  });

  it('handles empty string gracefully as a W1/1 window', () => {
    const windows = planSweepWindows('', 3800, 200);
    expect(windows).toHaveLength(1);
    expect(windows[0].windowIndex).toBe(0);
    expect(windows[0].windowCount).toBe(1);
    expect(windows[0].text).toBe('');
  });

  it('splits long text into overlapping windows snapped to sentences', () => {
    const paragraph = 'A long hallway stretches ahead. Shadows flicker on the stone walls. ';
    const longText = paragraph.repeat(400); // Exceeds token budget
    const windows = planSweepWindows(longText, 500, 50);

    expect(windows.length).toBeGreaterThan(1);
    expect(windows[0].windowCount).toBe(windows.length);
    // Ensure windowCount matches across all windows
    for (let i = 0; i < windows.length; i++) {
      expect(windows[i].windowIndex).toBe(i);
      expect(windows[i].windowCount).toBe(windows.length);
    }
    // Ensure sentences are not sliced mid-word
    expect(windows[0].text.endsWith('. ') || windows[0].text.endsWith('.')).toBe(true);
  });

  it('ensures overlapping window text covers entire source text', () => {
    const paragraph = 'First sector online. Second sector compromised. Third sector purged. ';
    const longText = paragraph.repeat(50);
    const windows = planSweepWindows(longText, 200, 30);

    expect(windows.length).toBeGreaterThan(1);
    expect(windows[0].sourceRange.start).toBe(0);
    expect(windows[windows.length - 1].sourceRange.end).toBe(longText.length);
  });
});
