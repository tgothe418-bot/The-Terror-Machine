/**
 * Safely extracts and parses a JSON blueprint from a potentially noisy LLM response.
 */
export function extractBlueprint(responseText: string): any | null {
  try {
    const cleanText = responseText.trim();
    
    // 1. Try to find a markdown-formatted JSON block (```json ... ```)
    const markdownMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    
    if (markdownMatch) {
      try {
        return JSON.parse(markdownMatch[1].trim());
      } catch {
        // Fall through
      }
    }

    // 2. Fallback: Try to find the first '{' and last '}'
    const start = cleanText.indexOf('{');
    const end = cleanText.lastIndexOf('}');
    
    if (start !== -1 && end !== -1 && end > start) {
      const potentialJson = cleanText.substring(start, end + 1);
      try {
        return JSON.parse(potentialJson);
      } catch {
        // Fall through
      }
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
