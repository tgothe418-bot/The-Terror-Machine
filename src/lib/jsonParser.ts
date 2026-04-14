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
      } catch (e) {
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
      } catch (e) {
        // Fall through
      }
    }

    // No valid JSON found
    return null;
  } catch (e) {
    // Only log if it's a truly unexpected error, not just a parsing failure
    return null;
  }
}
