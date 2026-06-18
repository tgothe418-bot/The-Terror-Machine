/* eslint-disable @typescript-eslint/no-explicit-any */
import { Message } from '../types';

/**
 * Converts a structured message array into a standardized markdown file and downloads it.
 */
export const exportConversationToMarkdown = (messages: Message[], sessionTitle: string = 'terror-machine-log'): void => {
  if (!messages || messages.length === 0) {
    console.warn('// EXPORT FAILED // History buffer is empty.');
    return;
  }

  const header = `# THE NIGHTMARE MACHINE // CONVERSATION LOG\n` +
                 `*Generated on: ${new Date().toISOString()}*\n` +
                 `==================================================\n\n`;

  const body = messages
    .map((msg, index) => {
      const actor = msg.role === 'user' ? '### USER' : '### THE VOICE';
      
      // Handle array blocks or fall back to raw string content
      let textContent = '';
      if (Array.isArray(msg.blocks)) {
        textContent = msg.blocks.map((b: any) => b.content).join('\n');
      } else {
        textContent = msg.content || '';
      }

      return `${actor} [Turn ${index + 1}]\n\n${textContent.trim()}\n\n---`;
    })
    .join('\n\n');

  const fullContent = header + body;
  const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.setAttribute('download', `${sessionTitle}-${Date.now()}.md`);
  
  document.body.appendChild(downloadLink);
  downloadLink.click();
  
  // Cleanup browser resource frame
  setTimeout(() => {
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
    console.log('// TELEMETRY EXPORTED SUCCESSFUL //');
  }, 100);
};

/**
 * Triggers a browser download of a JSON object as a file.
 * @param data The object to download.
 * @param filename The name of the file (e.g., 'scenario_blueprint.json').
 */
export function downloadJson(data: any, filename: string) {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Small delay before cleanup to ensure trigger in some browsers
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Download failed:', error);
  }
}

export const escapeHtml = (unsafe: string | null | undefined): string => {
  if (unsafe == null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const exportEngineLog = (messages: any[], format: 'md' | 'html', title: string = 'engine-telemetry', blueprint?: any) => {
  if (!messages || messages.length === 0) {
    console.warn('// ENGINE EXPORT FAILED // Empty array state passed.');
    return;
  }

  const timestamp = new Date().toISOString();
  let content = '';
  let mimeType = '';
  let extension = '';

  if (format === 'html') {
    mimeType = 'text/html;charset=utf-8;';
    extension = 'html';
    content = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>The Nightmare Machine // Telemetry Stream - ${escapeHtml(title)}</title>
        <style>
          body { 
            background-color: #000000; 
            color: #d1d5db; 
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; 
            padding: 3rem 2rem; 
            max-width: 900px; 
            margin: 0 auto; 
            line-height: 1.7; 
          }
          .meta-header { 
            color: #52525b; 
            font-size: 0.75rem; 
            letter-spacing: 0.1em; 
            border-bottom: 1px solid #18181b; 
            padding-bottom: 1.5rem; 
            margin-bottom: 3rem; 
            text-transform: uppercase;
          }
          .turn { 
            margin-bottom: 3.5rem; 
            padding-bottom: 1.5rem; 
          }
          .user-input { 
            color: #71717a; 
            font-size: 0.95rem;
            margin-bottom: 1.5rem;
            padding-left: 0.5rem;
            border-left: 2px solid #27272a;
          }
          .block-prose { 
            color: #e4e4e7; 
            margin-bottom: 1.25rem; 
            font-size: 1rem;
          }
          .block-dialogue { 
            color: #a1a1aa; 
            font-style: italic; 
            margin-bottom: 1.25rem; 
            padding-left: 1.25rem; 
            border-left: 2px solid #3f3f46; 
          }
          .block-system_voice { 
            color: #ef4444; 
            font-weight: 700; 
            text-transform: uppercase; 
            margin-bottom: 1.25rem; 
            letter-spacing: 0.05em; 
          }
          .logic-panel { 
            background-color: #09090b; 
            border: 1px dashed #27272a; 
            margin-top: 1.5rem; 
            border-radius: 4px;
            font-size: 0.8rem;
          }
          summary {
            padding: 0.75rem 1rem;
            color: #52525b;
            cursor: pointer;
            user-select: none;
            font-weight: bold;
            outline: none;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          summary:hover {
            color: #a1a1aa;
            background-color: #121214;
          }
          .logic-content {
            padding: 1rem;
            border-t: 1px dashed #27272a;
            color: #22c55e;
            background-color: #020617;
            overflow-x: auto;
            white-space: pre-wrap;
          }
          .speaker-label { font-size: 0.75rem; font-weight: bold; margin-bottom: 0.25rem; font-family: sans-serif; letter-spacing: 0.05em; text-transform: uppercase; }
          .speaker-user { color: #60a5fa; } /* Blue */
          .speaker-character { color: #a78bfa; } /* Purple */
          .speaker-voice { color: #f87171; } /* Red */
          .speaker-engine { color: #4ade80; } /* Green */
        </style>
      </head>
      <body>
        <div class="meta-header">
          THE NIGHTMARE MACHINE // RUNTIME CORE TELEMETRY METRICS<br>
          TRACE CAPTURE ID: ${Date.now()}<br>
          TIMESTAMP: ${timestamp}
        </div>
    `;

    messages.forEach((msg) => {
      content += `<div class="turn">`;
      if (msg.role === 'user') {
        const userCharName = blueprint?.cast?.find((c: any) => c.isUserCharacter)?.name || 'Protagonist';
        content += `<div class="speaker-label speaker-user">[ USER: ${escapeHtml(userCharName)} ]</div>`;
        content += `<div class="user-input">&gt; ${escapeHtml(msg.content)}</div>`;
      } else {
        // Parse Engine Array Content
        const renderBlock = (block: any) => {
          if (block.type === 'engine_thoughts') return;
          if (block.type === 'system_voice') {
            content += `<div class="speaker-label speaker-voice">[ THE VOICE ]</div>`;
          } else if (block.type === 'dialogue' && block.speaker) {
            content += `<div class="speaker-label speaker-character">[ CHARACTER: ${escapeHtml(block.speaker)} ]</div>`;
          } else if (block.type === 'internal_monologue' && block.speaker) {
            content += `<div class="speaker-label speaker-character">[ THOUGHT: ${escapeHtml(block.speaker)} ]</div>`;
          }
          content += `<div class="block-${block.type || 'prose'}">${escapeHtml(block.content)}</div>`;
        };
        
        if (Array.isArray(msg.content)) {
          msg.content.forEach(renderBlock);
        } else if (msg.blocks && Array.isArray(msg.blocks)) {
          msg.blocks.forEach(renderBlock);
        } else {
          content += `<div class="block-prose">${escapeHtml(msg.content)}</div>`;
        }

        // Auto-bake interactive dropdown if engine telemetry exists
        if (msg.engine_thoughts || msg.logic_state) {
          const logicData = msg.engine_thoughts || msg.logic_state;
          const displayString = typeof logicData === 'object' 
            ? JSON.stringify(logicData, null, 2) 
            : String(logicData);

          content += `
            <details class="logic-panel">
              <summary class="speaker-label speaker-engine">[ VIEW ENGINE LOGIC DATA ]</summary>
              <pre class="logic-content"><code>${escapeHtml(displayString)}</code></pre>
            </details>
          `;
        }
      }
      content += `</div>`;
    });
    content += `</body></html>`;
  } else {
    // Markdown Standard Flow
    mimeType = 'text/markdown;charset=utf-8;';
    extension = 'md';
    content = `# THE NIGHTMARE MACHINE // METRIC LOG\n*Captured: ${timestamp}*\n\n---\n\n`;
    
    messages.forEach((msg) => {
      if (msg.role === 'user') {
        const userCharName = blueprint?.cast?.find((c: any) => c.isUserCharacter)?.name || 'Protagonist';
        content += `**[ USER: ${userCharName} ]**\n> ${msg.content}\n\n`;
      } else {
        const blocks = Array.isArray(msg.content) ? msg.content : (msg.blocks || []);
        if (blocks.length > 0) {
          blocks.forEach((block: any) => {
            if (block.type === 'system_voice') content += `**[ THE VOICE ]**\n${block.content}\n\n`;
            else if (block.type === 'engine_thoughts') content += `\`\`\`json\n// METRIC COMPONENT\n${block.content}\n\`\`\`\n\n`;
            else if (block.type === 'dialogue' && block.speaker) content += `**[ CHARACTER: ${block.speaker} ]**\n${block.content}\n\n`;
            else if (block.type === 'internal_monologue' && block.speaker) content += `**[ THOUGHT: ${block.speaker} ]**\n${block.content}\n\n`;
            else content += `${block.content}\n\n`;
          });
        } else {
          content += `${msg.content}\n\n`;
        }
      }
      content += `---\n\n`;
    });
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.setAttribute('download', `${title}-${Date.now()}.${extension}`);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
};

