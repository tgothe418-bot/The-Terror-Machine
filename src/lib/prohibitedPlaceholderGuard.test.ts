import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function getFilesRecursively(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('Prohibited Placeholder Name Policy Guard', () => {
  it('scans src and server and ensures no prohibited placeholder names exist as whole words', () => {
    // We use safe character classes to prevent self-matching the guard test itself
    const prohibitedPatterns = [
      { name: 'Forbidden Token 1', regex: /\b[E]lena\b/i },
      { name: 'Forbidden Token 2', regex: /\b[V]ance\b/i },
    ];

    const rootDir = process.cwd();
    const targetDirs = [path.join(rootDir, 'src'), path.join(rootDir, 'server')];
    const violations: { file: string; line: number; token: string; content: string }[] = [];

    for (const targetDir of targetDirs) {
      if (!fs.existsSync(targetDir)) continue;
      const allFiles = getFilesRecursively(targetDir);

      for (const file of allFiles) {
        // Only inspect code/test/schema/json files
        if (!/\.(ts|tsx|js|jsx|json|md)$/.test(file)) continue;

        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((lineText, index) => {
          for (const pattern of prohibitedPatterns) {
            if (pattern.regex.test(lineText)) {
              // Ignore this test file's pattern definitions
              if (file.endsWith('prohibitedPlaceholderGuard.test.ts') && lineText.includes('regex:')) {
                continue;
              }
              violations.push({
                file: path.relative(rootDir, file),
                line: index + 1,
                token: pattern.name,
                content: lineText.trim(),
              });
            }
          }
        });
      }
    }

    expect(
      violations,
      `Found prohibited placeholder names:\n${violations
        .map((v) => `  ${v.file}:${v.line} [${v.token}] -> ${v.content}`)
        .join('\n')}`
    ).toEqual([]);
  });
});
