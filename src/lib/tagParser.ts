export interface ParsedSemanticTags {
  cleanText: string;
  tags: Record<string, string[]> | null;
}

export const extractSemanticTags = (rawText: string): ParsedSemanticTags => {
  // Regex: Find the last occurrence of brackets containing text
  const match = rawText.match(/\[(.*?)\](?=[^[]*$)/);
  
  if (!match) {
    return { cleanText: rawText.trim(), tags: null };
  }

  // Strip the tags from the prose so the user never sees them
  const cleanText = rawText.replace(match[0], '').trim();
  const tagString = match[1];
  const parsedTags: Record<string, string[]> = {};

  // Split into categories (e.g., SOMA: a, b | GEOM: c)
  const segments = tagString.split('|');
  
  segments.forEach(segment => {
    const [key, value] = segment.split(':');
    if (key && value) {
      // Map comma-separated values into arrays
      parsedTags[key.trim()] = value.split(',').map(v => v.trim());
    }
  });

  return { cleanText, tags: parsedTags };
};
