export function extractEngineTags(rawProse: string) {
  const tagRegex = /\[(SOMA|GEOM|SYS|IMP):\s*(.*?)\]/g;
  const tags: Record<string, string[]> = { SOMA: [], GEOM: [], SYS: [], IMP: [] };
  
  let cleanProse = rawProse;
  let match;

  while ((match = tagRegex.exec(rawProse)) !== null) {
    const type = match[1];
    const values = match[2].split(',').map(v => v.trim());
    tags[type].push(...values);
  }

  // Remove the tags from the text so the UI gets clean prose
  cleanProse = rawProse.replace(tagRegex, '').trim();

  return { cleanProse, tags };
}
