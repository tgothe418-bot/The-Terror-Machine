/* eslint-disable @typescript-eslint/no-explicit-any */
import { Message, ContextReceipt } from '../types';
import { buildEngineTurnContext, buildContextReceipt } from './buildEngineTurnContext';

/**
 * Converts a structured message array into a standardized markdown file and downloads it.
 */
export const exportConversationToMarkdown = (
  messages: Message[],
  sessionTitle: string = 'terror-machine-log'
): void => {
  if (!messages || messages.length === 0) {
    console.warn('// EXPORT FAILED // History buffer is empty.');
    return;
  }

  const header =
    `# THE NIGHTMARE MACHINE // CONVERSATION LOG\n` +
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
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
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
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const getEngineLogicData = (message: any): Record<string, unknown> | null => {
  const logicData: Record<string, unknown> = {};

  if (typeof message.engine_thoughts === 'string' && message.engine_thoughts.trim()) {
    logicData.engine_thoughts = message.engine_thoughts;
  }
  if (message.logic_state !== undefined) {
    logicData.logic_state = message.logic_state;
  }
  if (message.topologyDelta !== undefined) {
    logicData.topologyDelta = message.topologyDelta;
  }
  if (message.validation !== undefined) {
    logicData.validation = message.validation;
  }
  if (message.transitionReceipt !== undefined) {
    logicData.transitionReceipt = message.transitionReceipt;
  }
  if (message.turnReceipt !== undefined) {
    logicData.turnReceipt = message.turnReceipt;
  }
  if (message.failureReceipt !== undefined) {
    logicData.failureReceipt = message.failureReceipt;
  }

  return Object.keys(logicData).length > 0 ? logicData : null;
};

const getEngineLogicSummary = (logicData: Record<string, unknown>): string => {
  const summary = ['TTM LOGIC'];
  const logicState = logicData.logic_state;
  const topologyDelta = logicData.topologyDelta;
  const failureReceipt = logicData.failureReceipt;

  if (failureReceipt && typeof failureReceipt === 'object') {
    const fail = failureReceipt as Record<string, unknown>;
    if (fail.code) {
      summary.push(`FAILURE: ${String(fail.code).toUpperCase()}`);
    }
    if (fail.status != null) {
      summary.push(`STATUS: ${String(fail.status)}`);
    }
  }

  if (logicState && typeof logicState === 'object') {
    const state = logicState as Record<string, unknown>;
    if (state.current_phase != null)
      summary.push(`PHASE: ${String(state.current_phase).toUpperCase()}`);
    if (state.suggested_tension != null)
      summary.push(`TENSION: ${String(state.suggested_tension)}`);
    if (state.intent_classification != null)
      summary.push(`INTENT: ${String(state.intent_classification).toUpperCase()}`);
  }

  if (topologyDelta && typeof topologyDelta === 'object') {
    const topology = topologyDelta as Record<string, unknown>;
    if (topology.isExpansion != null)
      summary.push(`EXPANSION: ${String(Boolean(topology.isExpansion)).toUpperCase()}`);
  }

  return `[ ${summary.join(' // ')} ]`;
};

export const buildEngineLogContent = (
  messages: any[],
  format: 'md' | 'html',
  title: string = 'engine-telemetry',
  blueprint?: any,
  capturedAt: Date = new Date()
) => {
  if (!messages || messages.length === 0) {
    return null;
  }

  const timestamp = capturedAt.toISOString();
  let content = '';
  let mimeType = '';
  let extension = '';

  // 1. Resolve Context Receipt (either recorded in messages or synthesized from blueprint)
  let receipt: ContextReceipt | null = null;
  const recordedReceiptMsg = messages.find((m) => m && m.contextReceipt);
  if (recordedReceiptMsg?.contextReceipt) {
    receipt = recordedReceiptMsg.contextReceipt;
  } else if (blueprint && typeof blueprint === 'object') {
    try {
      const turnContext = buildEngineTurnContext({ blueprint });
      receipt = buildContextReceipt(turnContext, blueprint);
    } catch {
      receipt = null;
    }
  }

  // 2. Helper to resolve user perspective label
  const resolveUserLabel = (msg: any): string => {
    if (msg.userCharacterName) return msg.userCharacterName;
    if (receipt?.resolvedPlayerName) return receipt.resolvedPlayerName;
    if (receipt?.selectedRole) return String(receipt.selectedRole).toUpperCase();
    if (blueprint?.cast && Array.isArray(blueprint.cast)) {
      const userChar = blueprint.cast.find((c: any) => c.isUserCharacter);
      if (userChar?.name) return userChar.name;
    }
    return 'Protagonist';
  };

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
            margin-bottom: 2rem;
            text-transform: uppercase;
          }
          .context-receipt {
            background-color: #09090b;
            border: 1px solid #27272a;
            border-radius: 4px;
            padding: 1.25rem;
            margin-bottom: 2.5rem;
            font-size: 0.8rem;
          }
          .receipt-header {
            color: #a1a1aa;
            font-weight: bold;
            margin-bottom: 0.75rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .receipt-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 0.5rem;
            color: #d4d4d8;
          }
          .receipt-item { line-height: 1.5; }
          .receipt-key { color: #71717a; text-transform: uppercase; font-size: 0.75rem; margin-right: 0.25rem; }
          .receipt-val { font-weight: 600; color: #f4f4f5; }
          .receipt-sub { color: #71717a; font-size: 0.75rem; }
          .turn {
            margin-bottom: 3.5rem;
            padding-bottom: 1.5rem;
          }
          .user-input {
            color: #71717a;
            font-size: 0.95rem;
            font-style: italic;
            margin-bottom: 1.5rem;
            padding-left: 1rem;
            border-left: 2px solid #27272a;
          }
          .block-prose {
            margin-bottom: 1.25rem;
            color: #e4e4e7;
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
            border-top: 1px dashed #27272a;
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
          TRACE CAPTURE ID: ${capturedAt.getTime()}<br>
          TIMESTAMP: ${timestamp}
        </div>

        ${
          receipt
            ? `
        <div class="context-receipt">
          <div class="receipt-header">[ CONTEXT RECEIPT // SCENARIO BINDING v${receipt.version} ]</div>
          <div class="receipt-grid">
            <div class="receipt-item"><span class="receipt-key">SCENARIO:</span> <span class="receipt-val">${escapeHtml(receipt.scenarioTitle)}</span> ${receipt.blueprintId ? `<span class="receipt-sub">(${escapeHtml(receipt.blueprintId)})</span>` : ''}</div>
            <div class="receipt-item"><span class="receipt-key">ROLE:</span> <span class="receipt-val">${escapeHtml(String(receipt.selectedRole).toUpperCase())}</span> | <span class="receipt-key">BOUND PLAYER:</span> <span class="receipt-val">${escapeHtml(receipt.resolvedPlayerName)}</span> ${receipt.resolvedPlayerId ? `<span class="receipt-sub">(ID: ${escapeHtml(receipt.resolvedPlayerId)})</span>` : ''}</div>
            <div class="receipt-item"><span class="receipt-key">ORIGIN NODE:</span> <span class="receipt-val">${escapeHtml(receipt.readableNodeLabel)}</span> <span class="receipt-sub">(${escapeHtml(receipt.currentNodeId)})</span></div>
            <div class="receipt-item"><span class="receipt-key">COORDINATE:</span> <span class="receipt-val">[${escapeHtml(receipt.activeVector)}, ${escapeHtml(receipt.activeTier)}]</span></div>
            <div class="receipt-item"><span class="receipt-key">ROSTER &amp; RULES:</span> <span class="receipt-val">${receipt.castCount} Cast Members | ${receipt.worldRuleCount} World Rules</span></div>
            <div class="receipt-item"><span class="receipt-key">TOPOLOGY:</span> <span class="receipt-val">${receipt.topologyNodeCount} Nodes | ${receipt.topologyConnectionCount} Connections</span></div>
          </div>
        </div>
        `
            : ''
        }
    `;

    messages.forEach((msg) => {
      content += `<div class="turn">`;
      if (msg.role === 'user') {
        const userCharName = resolveUserLabel(msg);
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

        // Keep the structured Engine decision record between narrative turns.
        const logicData = getEngineLogicData(msg);
        if (logicData) {
          const displayString = JSON.stringify(logicData, null, 2);
          const summary = getEngineLogicSummary(logicData);

          content += `
            <details class="logic-panel">
              <summary class="speaker-label speaker-engine">${escapeHtml(summary)}</summary>
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

    if (receipt) {
      content +=
        `### [ CONTEXT RECEIPT // SCENARIO BINDING v${receipt.version} ]\n` +
        `- **Scenario:** ${receipt.scenarioTitle} ${receipt.blueprintId ? `(${receipt.blueprintId})` : ''}\n` +
        `- **Player Role:** ${String(receipt.selectedRole).toUpperCase()} | **Bound Player:** ${receipt.resolvedPlayerName} ${receipt.resolvedPlayerId ? `(ID: ${receipt.resolvedPlayerId})` : ''}\n` +
        `- **Origin Node:** ${receipt.readableNodeLabel} (\`${receipt.currentNodeId}\`)\n` +
        `- **Coordinate:** [${receipt.activeVector}, ${receipt.activeTier}]\n` +
        `- **Authoring:** ${receipt.castCount} Cast Members | ${receipt.worldRuleCount} World Rules\n` +
        `- **Topology:** ${receipt.topologyNodeCount} Nodes | ${receipt.topologyConnectionCount} Connections\n\n` +
        `---\n\n`;
    }

    messages.forEach((msg) => {
      if (msg.role === 'user') {
        const userCharName = resolveUserLabel(msg);
        content += `**[ USER: ${userCharName} ]**\n> ${msg.content}\n\n`;
      } else {
        const blocks = Array.isArray(msg.content) ? msg.content : msg.blocks || [];
        if (blocks.length > 0) {
          blocks.forEach((block: any) => {
            if (block.type === 'engine_thoughts') return;
            if (block.type === 'system_voice') content += `**[ THE VOICE ]**\n${block.content}\n\n`;
            else if (block.type === 'dialogue' && block.speaker)
              content += `**[ CHARACTER: ${block.speaker} ]**\n${block.content}\n\n`;
            else if (block.type === 'internal_monologue' && block.speaker)
              content += `**[ THOUGHT: ${block.speaker} ]**\n${block.content}\n\n`;
            else content += `${block.content}\n\n`;
          });
        } else {
          content += `${msg.content}\n\n`;
        }

        const logicData = getEngineLogicData(msg);
        if (logicData) {
          content += `\`\`\`json\n// TTM LOGIC\n${JSON.stringify(logicData, null, 2)}\n\`\`\`\n\n`;
        }
      }
      content += `---\n\n`;
    });
  }

  return { content, mimeType, extension };
};

export const exportEngineLog = (
  messages: any[],
  format: 'md' | 'html',
  title: string = 'engine-telemetry',
  blueprint?: any
) => {
  const output = buildEngineLogContent(messages, format, title, blueprint);
  if (!output) {
    console.warn('// ENGINE EXPORT FAILED // Empty array state passed.');
    return;
  }

  const { content, mimeType, extension } = output;
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
