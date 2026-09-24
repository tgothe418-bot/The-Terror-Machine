/**
 * Utility to parse JSON with fallback repair for truncated LLM responses.
 * When local or cloud models hit max_tokens or context limits, they often
 * truncate in the middle of a string, object, or array.
 */

function attemptClose(prefix: string): unknown | null {
  let inString = false;
  let isEscaped = false;
  const stack: ('{' | '[')[] = [];

  for (let i = 0; i < prefix.length; i++) {
    const char = prefix[i];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (char === '\\') {
      isEscaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack[stack.length - 1] === '{') stack.pop();
      } else if (char === ']') {
        if (stack[stack.length - 1] === '[') stack.pop();
      }
    }
  }

  let repaired = prefix;
  if (inString) {
    repaired += '"';
  }

  // Close open structures in reverse order
  for (let i = stack.length - 1; i >= 0; i--) {
    const open = stack[i];
    if (open === '{') repaired += '}';
    else if (open === '[') repaired += ']';
  }

  try {
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}

export function parseOrRepairJson<T = unknown>(rawInput: string): T {
  const jsonStr = (rawInput || '').trim();

  // 1. First attempt direct parse
  try {
    return JSON.parse(jsonStr) as T;
  } catch (err: unknown) {
    // If there is valid JSON followed by trailing content (e.g. at position N)
    const matchPos = err instanceof Error ? err.message.match(/at position (\d+)/i) : null;
    if (matchPos) {
      const pos = parseInt(matchPos[1], 10);
      if (pos > 0 && pos < jsonStr.length) {
        try {
          return JSON.parse(jsonStr.slice(0, pos).trim()) as T;
        } catch {
          // continue to other repair steps
        }
      }
    }
  }

  // 2. Attempt extracting first balanced JSON object from the string
  const firstBrace = jsonStr.indexOf('{');
  if (firstBrace >= 0) {
    let depth = 0;
    let inString = false;
    let isEscaped = false;
    for (let i = firstBrace; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      if (isEscaped) {
        isEscaped = false;
        continue;
      }
      if (char === '\\') {
        isEscaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') depth++;
        else if (char === '}') {
          depth--;
          if (depth === 0) {
            const balancedCandidate = jsonStr.slice(firstBrace, i + 1);
            try {
              return JSON.parse(balancedCandidate) as T;
            } catch {
              break;
            }
          }
        }
      }
    }
  }

  // 3. Direct attempt at closing open structures
  const direct = attemptClose(jsonStr);
  if (direct !== null) return direct as T;

  // 4. Iteratively peel back to previous structural delimiters
  let truncated = jsonStr;
  for (let step = 0; step < 100; step++) {
    const lastDelim = Math.max(
      truncated.lastIndexOf(','),
      truncated.lastIndexOf('{'),
      truncated.lastIndexOf('[')
    );
    if (lastDelim <= 0) break;
    truncated = truncated.slice(0, lastDelim);
    const result = attemptClose(truncated);
    if (result !== null) return result as T;
  }

  // If repair fails, run original JSON.parse to throw the natural SyntaxError
  return JSON.parse(jsonStr) as T;
}
