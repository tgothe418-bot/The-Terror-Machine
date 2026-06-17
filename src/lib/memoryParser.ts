import { Message } from '../types';
import { forgeActions } from '../store/useForgeStore';

const MEMORY_PARSER_PROMPT = `
You are the structural data parser for a psychological horror engine. 
Analyze the provided block of recent narrative history. 

Extract the current state of the protagonist into the following strict JSON schema:
{
  "tacticalImperative": "A single sentence describing their immediate, most urgent material goal.",
  "somaticState": ["Array of short strings describing physical injuries, debuffs, or current physical realities"],
  "relationalWeb": ["Array of short strings describing what the character has learned about their environment or hostile entities"]
}

Output ONLY valid JSON. No markdown formatting, no explanations.
`;

export const distillContextWindow = async (recentMessages: Message[]): Promise<void> => {
  const conversationText = recentMessages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  try {
    // Replace with your actual LLM API execution call. 
    // Ensure you pass \`response_format: { type: "json_object" }\` if your API wrapper supports it.
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: `${MEMORY_PARSER_PROMPT}\n\n[ RECENT HISTORY ]:\n${conversationText}` 
      })
    });

    if (!response.ok) throw new Error('Memory distillation failed');
    
    const data = await response.json();
    const parsedMemory = JSON.parse(data.text);

    // Commit the distilled facts to the permanent store
    forgeActions.updateActiveMemory({
      tacticalImperative: parsedMemory.tacticalImperative,
      somaticState: parsedMemory.somaticState,
      relationalWeb: parsedMemory.relationalWeb
    });

    console.log("[MEMORY PARSER] State successfully distilled and committed.");

  } catch (error) {
    console.error("[MEMORY PARSER ERROR] Failed to distill context:", error);
  }
};
