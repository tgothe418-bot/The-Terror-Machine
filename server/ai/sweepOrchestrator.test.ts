import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSweepJob,
  getSweepJob,
  cancelSweepJob,
  clearSweepJobs,
  resolveEvidenceSourceRange,
  buildSweepPrompt,
} from './sweepOrchestrator';

describe('sweepOrchestrator', () => {
  beforeEach(() => {
    clearSweepJobs();
  });

  it('creates, retrieves, and tracks sweep jobs in ledger', () => {
    const job = createSweepJob('binding-test-1', 'digest-abc', 3, {
      provider: 'gemini',
      modelId: 'gemini-2.5-flash',
    });

    expect(job.jobId).toBeDefined();
    expect(job.status).toBe('queued');
    expect(job.totalWindows).toBe(3);
    expect(job.modelConfig.provider).toBe('gemini');

    const retrieved = getSweepJob(job.jobId);
    expect(retrieved).toBe(job);
  });

  it('cooperatively cancels active sweep jobs', () => {
    const job = createSweepJob('binding-cancel-1', 'digest-xyz', 2, {
      provider: 'local',
      modelId: 'local-gemma-27b',
    });

    expect(job.isCancelled).toBe(false);
    const cancelResult = cancelSweepJob(job.jobId);
    expect(cancelResult).toBe(true);
    expect(job.isCancelled).toBe(true);
    expect(job.status).toBe('cancelled');

    // Cancelling already cancelled or complete job returns false
    expect(cancelSweepJob(job.jobId)).toBe(false);
  });

  it('resolves evidence sourceRange within window text correctly', () => {
    const windowText = 'The cold wind howled across the high ridge. Dr. Holt checked the barometer.';
    const sourceStart = 100;
    const excerpt = 'Dr. Holt checked the barometer.';

    const range = resolveEvidenceSourceRange(windowText, sourceStart, excerpt);
    expect(range).toBeDefined();
    expect(range?.start).toBe(100 + windowText.indexOf(excerpt));
    expect(range?.end).toBe(range!.start + excerpt.length);
  });

  it('returns undefined for missing or mismatched excerpt', () => {
    const windowText = 'Simple corridor text.';
    expect(resolveEvidenceSourceRange(windowText, 0, undefined)).toBeUndefined();
    expect(resolveEvidenceSourceRange(windowText, 0, 'nonexistent text')).toBeUndefined();
  });

  it('builds sweep prompt under different lenses with negative context', () => {
    const window = {
      windowIndex: 0,
      windowCount: 2,
      tokenRange: { start: 0, end: 500 },
      sourceRange: { start: 0, end: 1800 },
      text: 'Sample window text.',
    };

    const prompt = buildSweepPrompt(window, 'TOPOLOGY', ['Autopsy Ward'], ['Dr. Aris']);
    expect(prompt).toContain('Window [1/2]');
    expect(prompt).toContain('[TOPOLOGY]');
    expect(prompt).toContain('Autopsy Ward');
    expect(prompt).toContain('Dr. Aris');
    expect(prompt).toContain('Sample window text.');
  });
});
