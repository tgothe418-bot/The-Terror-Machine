/**
 * Safely extracts and parses a JSON blueprint from a potentially noisy LLM response.
 */
export function extractBlueprint(responseText: string, requiredKeys?: string[]): any | null {
  try {
    const cleanText = responseText.trim();
    
    // Helper to check if parsed JSON has the required keys
    const isValid = (obj: any): boolean => {
      if (!obj || typeof obj !== 'object') return false;
      if (!requiredKeys || requiredKeys.length === 0) return true;
      return requiredKeys.some(key => key in obj);
    }

    // 1. Try to find a markdown-formatted JSON block (```json ... ```)
    const markdownMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    
    if (markdownMatch) {
      try {
        const parsed = JSON.parse(markdownMatch[1].trim());
        if (isValid(parsed)) return parsed;
      } catch {
        // Fall through
      }
    }

    // 2. Fallback: Parse balanced braces to find all valid JSON objects
    let start = cleanText.indexOf('{');
    const candidates: any[] = [];
    
    while (start !== -1) {
      let depth = 0;
      let inString = false;
      let escapeNext = false;
      let end = -1;
      
      for (let i = start; i < cleanText.length; i++) {
        const char = cleanText[i];
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        if (char === '\\') {
          escapeNext = true;
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
              end = i;
              break;
            }
          }
        }
      }
      
      if (end !== -1) {
        const potentialJson = cleanText.substring(start, end + 1);
        try {
          const parsed = JSON.parse(potentialJson);
          if (isValid(parsed)) {
            candidates.push(parsed);
          }
        } catch {
          // keep looking
        }
        start = cleanText.indexOf('{', start + 1);
      } else {
        // Unbalanced, exit loop
        break;
      }
    }

    if (candidates.length > 0) {
        // Return the object with the most keys, assuming it's the main payload
        return candidates.reduce((a, b) => Object.keys(a).length > Object.keys(b).length ? a : b);
    }

    // No valid JSON found
    return null;
  } catch {
    // Only log if it's a truly unexpected error, not just a parsing failure
    return null;
  }
}

/**
 * Extracts character profiles from a [CAST_DATA] block in LLM response.
 */
export function extractCastData(responseText: string): any[] | null {
  const match = responseText.match(/\[CAST_DATA\]\s*([\s\S]*?)(?=\n\n|\n\[|$)/i);
  if (match) {
    try {
      // Find the JSON part within the block
      const jsonStr = match[1].trim();
      const start = jsonStr.indexOf('[');
      const end = jsonStr.lastIndexOf(']');
      if (start !== -1 && end !== -1) {
        return JSON.parse(jsonStr.substring(start, end + 1));
      }
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Extracts a single character from a [CAST_ADDED] block.
 */
export function extractAddedCharacter(responseText: string): any | null {
  const match = responseText.match(/\[CAST_ADDED\]\s*([\s\S]*?)(?=\n\n|\n\[|$)/i);
  if (match) {
    try {
      const jsonStr = match[1].trim();
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        return JSON.parse(jsonStr.substring(start, end + 1));
      }
    } catch {
      return null;
    }
  }
  return null;
}
