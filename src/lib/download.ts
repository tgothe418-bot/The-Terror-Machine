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

export const exportEngineLog = (messages: any[], format: 'md' | 'html', title: string = 'engine-telemetry') => {
  if (!messages || messages.length === 0) return;

  const timestamp = new Date().toISOString();
  let content = '';
  let mimeType = '';
  let extension = '';

  if (format === 'html') {
    mimeType = 'text/html;charset=utf-8;';
    extension = 'html';
    content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Engine Telemetry Log - ${timestamp}</title>
        <style>
          body { background-color: #000; color: #e5e7eb; font-family: monospace; padding: 2rem; max-width: 800px; margin: 0 auto; line-height: 1.6; }
          .turn { margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid #333; }
          .user-input { color: #888; font-style: italic; }
          .block-prose { color: #d1d5db; margin-bottom: 1rem; }
          .block-dialogue { color: #9ca3af; font-style: italic; margin-bottom: 1rem; padding-left: 1rem; border-left: 2px solid #555; }
          .block-system_voice { color: #ef4444; font-weight: bold; text-transform: uppercase; margin-bottom: 1rem; letter-spacing: 1px; }
          .block-engine_thoughts { background-color: #111; color: #6b7280; padding: 1rem; border: 1px dashed #333; margin-bottom: 1rem; font-size: 0.9em; }
          .meta { color: #555; font-size: 0.8em; margin-bottom: 2rem; }
        </style>
      </head>
      <body>
        <div class="meta">THE NIGHTMARE MACHINE // ENGINE TELEMETRY<br>Generated: ${timestamp}</div>
    `;

    messages.forEach((msg) => {
      content += `<div class="turn">`;
      if (msg.role === 'user') {
        content += `<div class="user-input">> ${msg.content}</div>`;
      } else if (msg.role === 'engine' || msg.role === 'assistant') {
        // If it's a parsed JSON response with narrative blocks
        if (msg.blocks && Array.isArray(msg.blocks)) {
          msg.blocks.forEach((block: any) => {
             content += `<div class="block-${block.type || 'prose'}">${block.content || JSON.stringify(block)}</div>`;
          });
        } else if (Array.isArray(msg.content)) {
          msg.content.forEach((block: any) => {
             content += `<div class="block-${block.type || 'prose'}">${block.content || JSON.stringify(block)}</div>`;
          });
        } else {
           content += `<div class="block-prose">${msg.content}</div>`;
        }
      }
      content += `</div>`;
    });
    content += `</body></html>`;
  } else {
    // Markdown Fallback
    mimeType = 'text/markdown;charset=utf-8;';
    extension = 'md';
    content = `# THE NIGHTMARE MACHINE // ENGINE TELEMETRY\n*Generated: ${timestamp}*\n\n---\n\n`;
    messages.forEach((msg) => {
      if (msg.role === 'user') {
        content += `> ${msg.content}\n\n`;
      } else if (msg.role === 'engine' || msg.role === 'assistant') {
        if (msg.blocks && Array.isArray(msg.blocks)) {
          msg.blocks.forEach((block: any) => {
            if (block.type === 'system_voice') content += `**[ ${block.content.toUpperCase()} ]**\n\n`;
            else if (block.type === 'engine_thoughts') content += `\`\`\`json\n// ENGINE LOGIC\n${block.content}\n\`\`\`\n\n`;
            else content += `${block.content}\n\n`;
          });
        } else if (Array.isArray(msg.content)) {
          msg.content.forEach((block: any) => {
            if (block.type === 'system_voice') content += `**[ ${block.content.toUpperCase()} ]**\n\n`;
            else if (block.type === 'engine_thoughts') content += `\`\`\`json\n// ENGINE LOGIC\n${block.content}\n\`\`\`\n\n`;
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

