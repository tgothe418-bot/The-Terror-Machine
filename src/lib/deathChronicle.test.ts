import { describe, it, expect, vi } from 'vitest';
import {
  validateClosingLine,
  formatFictionalDuration,
  buildChronicle,
  formatChronicleToMarkdown,
  downloadChronicleAsMarkdown,
} from './deathChronicle';
import type { DeathRecord } from '../types/death';

describe('§10 Death Chronicle Spec', () => {
  describe('validateClosingLine', () => {
    it('accepts valid single sentence <= 200 chars with no markup', () => {
      const valid = 'The cold salt spray washed the pier until dawn.';
      expect(validateClosingLine(valid)).toEqual({ valid: true });
    });

    it('rejects multiple sentences', () => {
      const multi = 'The pier was empty. No one came back.';
      const res = validateClosingLine(multi);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('single sentence');
    });

    it('rejects Markdown formatting (bold, italics, code, links)', () => {
      expect(validateClosingLine('The *cold* salt spray remained.').valid).toBe(false);
      expect(validateClosingLine('The _cold_ salt spray remained.').valid).toBe(false);
      expect(validateClosingLine('The `cold` salt spray remained.').valid).toBe(false);
      expect(validateClosingLine('The [pier] remained.').valid).toBe(false);
      expect(validateClosingLine('# The pier remained.').valid).toBe(false);
    });

    it('rejects HTML formatting', () => {
      expect(validateClosingLine('The <b>pier</b> remained.').valid).toBe(false);
      expect(validateClosingLine('The <span class="dread">pier</span> remained.').valid).toBe(false);
    });

    it('rejects closing lines exceeding 200 characters', () => {
      const longSentence = 'A'.repeat(201) + '.';
      const res = validateClosingLine(longSentence);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('exceeds 200 characters');
    });
  });

  describe('formatFictionalDuration', () => {
    it('formats seconds, minutes, and hours accurately', () => {
      expect(formatFictionalDuration(45)).toBe('45s');
      expect(formatFictionalDuration(120)).toBe('2m');
      expect(formatFictionalDuration(150)).toBe('2m 30s');
      expect(formatFictionalDuration(3600)).toBe('1h 0m');
      expect(formatFictionalDuration(3665)).toBe('1h 1m');
    });
  });

  describe('buildChronicle (Deterministic Assembly)', () => {
    const deaths: DeathRecord[] = [
      {
        id: 'death-1',
        characterId: 'char-1',
        characterName: 'Dr. Ross',
        woundFactIds: ['char-1:w1'],
        primaryWoundFactId: 'char-1:w1',
        valence: 'murder',
        declaredAtTurn: 4,
        declaredAtFictionalTime: 1200,
        isPovDeath: false,
        isSacrifice: false,
      },
    ];

    it('assembles cast fates, cohort progression, casualties, evidence, and closing line', () => {
      const chronicle = buildChronicle({
        scenarioTitle: 'Black Iron Mortuary',
        turnCount: 5,
        fictionalSeconds: 1500,
        deathRecords: deaths,
        phaseHistory: ['ONSET', 'ESCALATION', 'CONFRONTATION'],
        evidence: [
          'bloodied scalpel',
          { label: 'empty syringe' },
          { text: 'shattered lens' },
        ],
        cast: [
          { id: 'char-1', name: 'Dr. Ross' },
          { id: 'char-2', name: 'Officer Holt', starting_location: 'vault' },
        ],
        closingLine: 'The hum of the conduit pipes never ceased.',
      });

      expect(chronicle.scenarioTitle).toBe('Black Iron Mortuary');
      expect(chronicle.turnCount).toBe(5);
      expect(chronicle.fictionalDurationText).toBe('25m');
      expect(chronicle.castFates).toHaveLength(2);
      expect(chronicle.castFates[0].name).toBe('Dr. Ross');
      expect(chronicle.castFates[0].fate).toContain('Deceased (murder)');
      expect(chronicle.castFates[1].name).toBe('Officer Holt');
      expect(chronicle.castFates[1].fate).toContain('Survived');
      expect(chronicle.cohortPhaseHistory).toEqual(['ONSET', 'ESCALATION', 'CONFRONTATION']);
      expect(chronicle.deaths).toHaveLength(1);
      expect(chronicle.keyEvidence).toEqual(['bloodied scalpel', 'empty syringe', 'shattered lens']);
      expect(chronicle.closingLine).toBe('The hum of the conduit pipes never ceased.');
    });

    it('falls back to default closing line when proposed line breaks constraints', () => {
      const chronicle = buildChronicle({
        scenarioTitle: 'Test',
        turnCount: 1,
        deathRecords: [],
        closingLine: '**Bold sentence.** Second sentence.',
      });

      expect(chronicle.closingLine).toBe('The record concludes without further testimony.');
    });

    it('caps key evidence at 20 items', () => {
      const twentyFiveItems = Array.from({ length: 25 }, (_, i) => `Evidence item ${i + 1}`);
      const chronicle = buildChronicle({
        scenarioTitle: 'Test',
        turnCount: 1,
        deathRecords: [],
        evidence: twentyFiveItems,
      });

      expect(chronicle.keyEvidence).toHaveLength(20);
    });
  });

  describe('formatChronicleToMarkdown & downloadChronicleAsMarkdown', () => {
    it('formats a clean, human-readable markdown document', () => {
      const chronicle = buildChronicle({
        scenarioTitle: 'Black Iron Mortuary',
        turnCount: 4,
        fictionalSeconds: 1200,
        deathRecords: [
          {
            id: 'death-1',
            characterId: 'char-1',
            characterName: 'Dr. Ross',
            woundFactIds: ['char-1:w1'],
            primaryWoundFactId: 'char-1:w1',
            valence: 'murder',
            declaredAtTurn: 4,
            declaredAtFictionalTime: 1200,
            isPovDeath: true,
            isSacrifice: false,
          },
        ],
        phaseHistory: ['ONSET', 'CONFRONTATION'],
        cast: [{ id: 'char-1', name: 'Dr. Ross' }],
        closingLine: 'The machinery ticked down into absolute silence.',
      });

      const md = formatChronicleToMarkdown(chronicle);
      expect(md).toContain('# Chronicle: Black Iron Mortuary');
      expect(md).toContain('## Cast Fates');
      expect(md).toContain('Dr. Ross');
      expect(md).toContain('Deceased (murder)');
      expect(md).toContain('## Cohort Phase Progression');
      expect(md).toContain('ONSET → CONFRONTATION');
      expect(md).toContain('The machinery ticked down into absolute silence.');
    });

    it('triggers DOM download without throwing', () => {
      const chronicle = buildChronicle({
        scenarioTitle: 'Black Iron Mortuary',
        turnCount: 1,
        deathRecords: [],
      });

      // Mock DOM methods
      const clickMock = vi.fn();
      const appendChildMock = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as unknown as Node);
      const removeChildMock = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as unknown as Node);
      vi.spyOn(document, 'createElement').mockReturnValue({
        setAttribute: vi.fn(),
        click: clickMock,
      } as unknown as HTMLElement);

      expect(() => downloadChronicleAsMarkdown(chronicle)).not.toThrow();
      expect(clickMock).toHaveBeenCalled();

      appendChildMock.mockRestore();
      removeChildMock.mockRestore();
    });
  });
});
