import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  BANNED_FIRST_NAMES,
  BANNED_SURNAMES,
  isBannedInventedName,
  getBannedNamesPromptBlock,
} from './bannedNames';
import { getForgeExtractionPrompt } from './extractionContract';
import {
  ARCHITECT_GENERAL_SYSTEM_PROMPT,
  ARCHITECT_SYSTEM_PROMPT,
  FORGE_ARCHITECT_PROMPT,
} from '../core/prompts/architect';

describe('bannedNames (§13)', () => {
  it('contains expected seed prohibited first names and surnames', () => {
    expect(BANNED_FIRST_NAMES).toContain('Elias');
    expect(BANNED_FIRST_NAMES).toContain('Mara');
    expect(BANNED_FIRST_NAMES).toContain('Silas');
    expect(BANNED_FIRST_NAMES).toContain('Ezra');
    expect(BANNED_FIRST_NAMES).toContain('Gideon');
    expect(BANNED_FIRST_NAMES).toContain('Caleb');
    expect(BANNED_FIRST_NAMES).toContain('Lucien');
    expect(BANNED_FIRST_NAMES).toContain('Malachi');
    expect(BANNED_FIRST_NAMES).toContain('Damien');
    expect(BANNED_FIRST_NAMES).toContain('Damian');
    expect(BANNED_FIRST_NAMES).toContain('Astrid');
    expect(BANNED_FIRST_NAMES).toContain('Lilith');

    expect(BANNED_SURNAMES).toContain('Voss');
    expect(BANNED_SURNAMES).toContain('Crowe');
    expect(BANNED_SURNAMES).toContain('Blackwood');
    expect(BANNED_SURNAMES).toContain('Ravencroft');
    expect(BANNED_SURNAMES).toContain('Shadow');
    expect(BANNED_SURNAMES).toContain('Nightshade');
    expect(BANNED_SURNAMES).toContain('Graves');
    expect(BANNED_SURNAMES).toContain('Grimm');
    expect(BANNED_SURNAMES).toContain('Dark');
    expect(BANNED_SURNAMES).toContain('Cross');
    expect(BANNED_SURNAMES).toContain('Thor' + 'ne');
    expect(BANNED_SURNAMES).toContain('Sterling');
    expect(BANNED_SURNAMES).toContain('Holloway');
    expect(BANNED_SURNAMES).toContain('Vane');
    expect(BANNED_SURNAMES).toContain('Ashford');
  });

  it('correctly flags banned invented names regardless of casing or compound format', () => {
    expect(isBannedInventedName('Mara Voss')).toBe(true);
    expect(isBannedInventedName('Elias Crowe')).toBe(true);
    expect(isBannedInventedName('Silas')).toBe(true);
    expect(isBannedInventedName('Dr. Gideon Sterling')).toBe(true);
    expect(isBannedInventedName('mara voss')).toBe(true);
    expect(isBannedInventedName('MARA VOSS')).toBe(true);
    expect(isBannedInventedName('John-Blackwood')).toBe(true);
  });

  it('allows plausible, non-banned names', () => {
    expect(isBannedInventedName('Dale Brennan')).toBe(false);
    expect(isBannedInventedName('Sarah Porter')).toBe(false);
    expect(isBannedInventedName('David Miller')).toBe(false);
    expect(isBannedInventedName('')).toBe(false);
  });

  it('bypasses blocklist when canon-wins override is set (fromSource: true)', () => {
    // When a character originates in authentic source material, canon wins
    expect(isBannedInventedName('Mara Voss', { fromSource: true })).toBe(false);
    expect(isBannedInventedName('Elias Crowe', { fromSource: true })).toBe(false);
    expect(isBannedInventedName('Silas', { fromSource: true })).toBe(false);
    expect(isBannedInventedName('Dr. Gideon Sterling', { fromSource: true })).toBe(false);
  });

  it('verifies synchronization with architectural spec docs/banned-names.md', () => {
    // Repo location requirement: spec lives in docs/banned-names.md
    const specPath = path.resolve(__dirname, '../../docs/banned-names.md');
    expect(fs.existsSync(specPath)).toBe(true);

    const specContent = fs.readFileSync(specPath, 'utf-8');

    // Parse list items under sections
    const lines = specContent.split('\n');
    let currentSection: 'NONE' | 'FIRST_NAMES' | 'SURNAMES' = 'NONE';
    const specFirstNames: string[] = [];
    const specSurnames: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('## Prohibited First Names')) {
        currentSection = 'FIRST_NAMES';
      } else if (line.startsWith('## Prohibited Surnames')) {
        currentSection = 'SURNAMES';
      } else if (line.startsWith('## ')) {
        currentSection = 'NONE';
      } else if (line.startsWith('- ') && currentSection === 'FIRST_NAMES') {
        specFirstNames.push(line.replace('- ', '').trim());
      } else if (line.startsWith('- ') && currentSection === 'SURNAMES') {
        specSurnames.push(line.replace('- ', '').trim());
      }
    }

    expect(specFirstNames.length).toBeGreaterThan(0);
    expect(specSurnames.length).toBeGreaterThan(0);

    // Every name in the spec markdown MUST exist in the TypeScript runtime authority
    for (const name of specFirstNames) {
      expect(
        BANNED_FIRST_NAMES,
        `Expected first name '${name}' from docs/banned-names.md to exist in BANNED_FIRST_NAMES`
      ).toContain(name as (typeof BANNED_FIRST_NAMES)[number]);
    }

    for (const surname of specSurnames) {
      expect(
        BANNED_SURNAMES,
        `Expected surname '${surname}' from docs/banned-names.md to exist in BANNED_SURNAMES`
      ).toContain(surname as (typeof BANNED_SURNAMES)[number]);
    }
  });

  it('generates the prompt block containing banned names and Dale Brennan guidance', () => {
    const block = getBannedNamesPromptBlock();
    expect(block).toContain('PROHIBITED INVENTED NAMES & CAST NAMING DIRECTIVE');
    expect(block).toContain('CANON WINS');
    expect(block).toContain('Dale Brennan');
    expect(block).toContain('Elias Crowe');
    expect(block).toContain('Elias');
    expect(block).toContain('Voss');
  });

  it('embeds banned names prompt block into getForgeExtractionPrompt', () => {
    const prompt = getForgeExtractionPrompt('source_material.md');
    expect(prompt).toContain('PROHIBITED INVENTED NAMES & CAST NAMING DIRECTIVE');
    expect(prompt).toContain('DEATH CONTRACT & POWER BUDGET ELICITATION');
    expect(prompt).toContain('Dale Brennan is scarier than Elias Crowe');
  });

  it('embeds banned names prompt block into architect prompts', () => {
    expect(ARCHITECT_GENERAL_SYSTEM_PROMPT).toContain(
      'PROHIBITED INVENTED NAMES & CAST NAMING DIRECTIVE'
    );
    expect(ARCHITECT_SYSTEM_PROMPT).toContain(
      'PROHIBITED INVENTED NAMES & CAST NAMING DIRECTIVE'
    );
    expect(FORGE_ARCHITECT_PROMPT).toContain(
      'PROHIBITED INVENTED NAMES & CAST NAMING DIRECTIVE'
    );
  });
});
