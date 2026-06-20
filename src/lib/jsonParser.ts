/* eslint-disable @typescript-eslint/no-explicit-any */
import { Message } from '../types';

export const flattenTurnsForDistillation = (turns: Message[]): string => {
  return turns
    .map((turn) => {
      const rolePrefix = turn.role === 'user' ? 'USER INPUT:' : 'SYSTEM VOICE OUTPUT:';
      
      // If the turn contains structured blocks, extract the content text only
      if (Array.isArray(turn.blocks)) {
        const textContent = turn.blocks
          .map((block: any) => {
            // Only aggregate narrative content types, skip internal mechanics if necessary
            if (['prose', 'dialogue', 'internal_monologue', 'environmental_intrusion', 'system_voice'].includes(block.type)) {
              return block.content;
            }
            return '';
          })
          .filter(Boolean)
          .join('\n');
          
        return `${rolePrefix}\n${textContent}`;
      }

      // Fallback if content is a direct string payload
      return `${rolePrefix}\n${turn.content}`;
    })
    .join('\n\n---\n\n');
};

export function cleanJsonText(rawText: string): string {
  return rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
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
