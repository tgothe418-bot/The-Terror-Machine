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
