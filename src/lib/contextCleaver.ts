import { Message } from '../types';
import { generateCinematicSummary } from '../services/geminiService';

const MAX_ACTIVE_TURNS = 8;     // The immediate short-term memory horizon
const RETAINED_START_TURNS = 2; // The initial anchoring turns (the inciting incident)
const TRIGGER_THRESHOLD = MAX_ACTIVE_TURNS + RETAINED_START_TURNS + 4; // Buffer before culling

export const executeContextCleaver = async (messages: Message[]): Promise<Message[]> => {
  if (messages.length <= TRIGGER_THRESHOLD) {
    return messages;
  }

  const systemMessages = messages.filter(m => m.role === 'system');
  const dialogMessages = messages.filter(m => m.role !== 'system');

  if (dialogMessages.length <= TRIGGER_THRESHOLD) {
    return messages;
  }

  // 1. Isolate the blocks
  const anchoredStart = dialogMessages.slice(0, RETAINED_START_TURNS);
  const activeHorizon = dialogMessages.slice(-MAX_ACTIVE_TURNS);
  
  // The block of messages being permanently removed from context
  const culledBlock = dialogMessages.slice(RETAINED_START_TURNS, -MAX_ACTIVE_TURNS);

  // 2. Generate the cinematic summary of the missing time
  const cinematicSummaryText = await generateCinematicSummary(culledBlock);

  // 3. The Stylized UI & Context Marker
  const actShiftMarker: Message = {
    id: crypto.randomUUID(),
    role: 'assistant', 
    content: `\n\n<div class="border-y border-zinc-800 bg-black/40 p-4 my-6 font-mono">\n<span class="text-[10px] tracking-[0.2em] text-zinc-500 uppercase block mb-2">[ MEMORY DISTILLATION // TIME COMPRESSED ]</span>\n<p class="text-sm text-zinc-400 italic">${cinematicSummaryText}</p>\n</div>\n\n`
  };

  // 4. Reassemble the clean timeline
  return [
    ...systemMessages,
    ...anchoredStart,
    actShiftMarker,
    ...activeHorizon
  ];
};
