export interface WindowPlan {
  windowIndex: number;
  windowCount: number;
  tokenRange: { start: number; end: number };
  sourceRange: { start: number; end: number };
  text: string;
}

export function planSweepWindows(
  fullText: string,
  maxTokensPerWindow = 3800,
  overlapTokens = 200
): WindowPlan[] {
  const approxTokensPerChar = 1 / 3.8;
  const maxChars = Math.floor(maxTokensPerWindow / approxTokensPerChar);
  const overlapChars = Math.floor(overlapTokens / approxTokensPerChar);

  // Short source -> W1/1 single window
  if (fullText.length <= maxChars) {
    return [{
      windowIndex: 0,
      windowCount: 1,
      tokenRange: {
        start: 0,
        end: Math.max(1, Math.ceil(fullText.length * approxTokensPerChar)),
      },
      sourceRange: { start: 0, end: fullText.length },
      text: fullText,
    }];
  }

  const windows: WindowPlan[] = [];
  let cursor = 0;

  while (cursor < fullText.length) {
    let end = Math.min(cursor + maxChars, fullText.length);

    // Snap to sentence boundary if not at end of text
    if (end < fullText.length) {
      const windowSlice = fullText.slice(cursor, end);
      const minSnapPoint = Math.floor(maxChars * 0.7);
      const searchRegion = windowSlice.slice(minSnapPoint);
      const matches = Array.from(searchRegion.matchAll(/[.!?](\s+|$)/g));
      if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        if (lastMatch.index !== undefined) {
          end = cursor + minSnapPoint + lastMatch.index + lastMatch[0].length;
        }
      }
    }

    const windowText = fullText.slice(cursor, end);
    windows.push({
      windowIndex: windows.length,
      windowCount: 0, // stamped after completion
      tokenRange: {
        start: Math.floor(cursor * approxTokensPerChar),
        end: Math.max(1, Math.ceil(end * approxTokensPerChar)),
      },
      sourceRange: { start: cursor, end },
      text: windowText,
    });

    if (end >= fullText.length) break;
    cursor = Math.max(cursor + 1, end - overlapChars);
  }

  return windows.map((w) => ({ ...w, windowCount: windows.length }));
}
