import type { Attachment } from '../../src/types';
import { getOpenAiVoiceModel, type OpenAiVoiceModelId } from '../ai/voiceProviderPolicy';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const STARTUP_OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export interface VoiceHistoryMessage {
  role: string;
  content: unknown;
  attachments?: Attachment[];
}

type OpenAiInputContent =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string; detail: 'auto' }
  | { type: 'input_file'; file_data: string; filename: string };

export interface OpenAiInputMessage {
  role: 'user' | 'assistant';
  content: string | OpenAiInputContent[];
}

export interface OpenAiVoiceResult {
  text: string;
  model: OpenAiVoiceModelId;
  searchQueries?: string[];
}

export class OpenAiVoiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 502) {
    super(message);
    this.name = 'OpenAiVoiceError';
    this.code = code;
    this.status = status;
  }
}

export function resetOpenAiApiKey(newKey?: string): void {
  if (newKey !== undefined) {
    const normalized = newKey.trim().replace(/^['"]|['"]$/g, '');
    if (normalized) process.env.OPENAI_API_KEY = normalized;
    else delete process.env.OPENAI_API_KEY;
  }
}

export function hasOpenAiApiKey(): boolean {
  return Boolean((process.env.OPENAI_API_KEY || STARTUP_OPENAI_API_KEY)?.trim());
}

function getOpenAiApiKey(override?: string): string {
  const key = override?.trim() || process.env.OPENAI_API_KEY || STARTUP_OPENAI_API_KEY;
  if (!key?.trim()) {
    throw new OpenAiVoiceError(
      'MISSING_API_KEY',
      'Configure an OpenAI API key before selecting OpenAI for The Voice.',
      400
    );
  }
  return key.trim().replace(/^['"]|['"]$/g, '');
}

function safeText(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value ?? '');
}

function decodeTextAttachment(attachment: Attachment): string {
  const decoded = Buffer.from(attachment.data, 'base64').toString('utf8');
  return `\n\n--- ATTACHED FILE: ${attachment.name} ---\n${decoded}\n--- END ATTACHED FILE ---`;
}

function attachmentToOpenAiContent(attachment: Attachment): OpenAiInputContent {
  if (attachment.mimeType.startsWith('image/')) {
    return {
      type: 'input_image',
      image_url: `data:${attachment.mimeType};base64,${attachment.data}`,
      detail: 'auto',
    };
  }

  if (
    attachment.mimeType.startsWith('text/') ||
    attachment.mimeType === 'application/json' ||
    attachment.name.endsWith('.md') ||
    attachment.name.endsWith('.json')
  ) {
    return { type: 'input_text', text: decodeTextAttachment(attachment) };
  }

  return {
    type: 'input_file',
    file_data: `data:${attachment.mimeType};base64,${attachment.data}`,
    filename: attachment.name,
  };
}

export function buildOpenAiVoiceInput(history: VoiceHistoryMessage[]): OpenAiInputMessage[] {
  const recent = history.slice(-20);
  const firstUserIndex = recent.findIndex((message) => message.role === 'user');
  const relevant = firstUserIndex >= 0 ? recent.slice(firstUserIndex) : [];

  const input = relevant.map((message): OpenAiInputMessage => {
    const role =
      message.role === 'assistant' || message.role === 'voice' || message.role === 'model'
        ? 'assistant'
        : 'user';
    const content = safeText(message.content);
    if (role === 'assistant' || !message.attachments?.length) {
      return { role, content: content.trim() || '...' };
    }

    return {
      role,
      content: [
        { type: 'input_text', text: content.trim() || 'Please inspect the attached material.' },
        ...message.attachments.map(attachmentToOpenAiContent),
      ],
    };
  });

  if (input.length === 0 || input[input.length - 1].role !== 'user') {
    input.push({ role: 'user', content: 'Proceed.' });
  }
  return input;
}

type OpenAiResponsePayload = {
  status?: string;
  error?: { code?: string; message?: string } | null;
  output_text?: string;
  output?: Array<{
    type?: string;
    action?: { query?: string; queries?: string[] };
    content?: Array<{ type?: string; text?: string; refusal?: string }>;
  }>;
};

export function extractOpenAiVoiceResult(payload: OpenAiResponsePayload): {
  text: string;
  searchQueries?: string[];
} {
  if (payload.status && payload.status !== 'completed') {
    throw new OpenAiVoiceError(
      'INCOMPLETE_RESPONSE',
      'OpenAI did not complete The Voice response.'
    );
  }

  const refusals = (payload.output || []).flatMap((item) =>
    (item.content || [])
      .filter((content) => content.type === 'refusal' && content.refusal)
      .map(() => true)
  );
  if (refusals.length > 0) {
    throw new OpenAiVoiceError('PROVIDER_REFUSAL', 'OpenAI declined this Voice request.');
  }

  const outputText =
    typeof payload.output_text === 'string'
      ? payload.output_text.trim()
      : (payload.output || [])
          .flatMap((item) => item.content || [])
          .filter((content) => content.type === 'output_text' && typeof content.text === 'string')
          .map((content) => content.text?.trim())
          .filter(Boolean)
          .join('\n\n');

  if (!outputText) {
    throw new OpenAiVoiceError(
      'EMPTY_PROVIDER_RESPONSE',
      'OpenAI returned an empty Voice response.'
    );
  }

  const searchQueries = (payload.output || []).flatMap((item) => {
    if (item.type !== 'web_search_call') return [];
    if (Array.isArray(item.action?.queries)) return item.action.queries;
    return item.action?.query ? [item.action.query] : [];
  });

  return {
    text: outputText,
    ...(searchQueries.length > 0 ? { searchQueries } : {}),
  };
}

function classifyHttpFailure(status: number): OpenAiVoiceError {
  if (status === 401) {
    return new OpenAiVoiceError(
      'INVALID_API_KEY',
      'The OpenAI API key is invalid or unavailable to this project.',
      status
    );
  }
  if (status === 403) {
    return new OpenAiVoiceError(
      'MODEL_ACCESS_DENIED',
      'This OpenAI project does not have access to the selected Voice model.',
      status
    );
  }
  if (status === 429) {
    return new OpenAiVoiceError(
      'RATE_LIMIT_EXCEEDED',
      'The OpenAI API rate or spending limit has been reached.',
      status
    );
  }
  if (status === 400) {
    return new OpenAiVoiceError(
      'PROVIDER_REQUEST_REJECTED',
      'OpenAI rejected The Voice request configuration.',
      status
    );
  }
  return new OpenAiVoiceError(
    'PROVIDER_FAILURE',
    status >= 500
      ? 'OpenAI is temporarily unavailable for The Voice.'
      : 'The OpenAI Voice request failed.',
    status
  );
}

async function createOpenAiResponse({
  instructions,
  input,
  model,
  apiKey,
  enableWebSearch,
  reasoningEffort,
}: {
  instructions: string;
  input: OpenAiInputMessage[] | string;
  model: OpenAiVoiceModelId;
  apiKey?: string;
  enableWebSearch: boolean;
  reasoningEffort: 'low' | 'medium';
}): Promise<OpenAiResponsePayload> {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAiApiKey(apiKey)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      reasoning: { effort: reasoningEffort },
      ...(enableWebSearch ? { tools: [{ type: 'web_search_preview' }] } : {}),
      store: false,
    }),
  });

  if (!response.ok) throw classifyHttpFailure(response.status);
  return (await response.json()) as OpenAiResponsePayload;
}

export async function generateOpenAiVoice({
  instructions,
  history,
}: {
  instructions: string;
  history: VoiceHistoryMessage[];
}): Promise<OpenAiVoiceResult> {
  const model = getOpenAiVoiceModel();
  const payload = await createOpenAiResponse({
    instructions,
    input: buildOpenAiVoiceInput(history),
    model,
    enableWebSearch: true,
    reasoningEffort: 'medium',
  });
  return { ...extractOpenAiVoiceResult(payload), model };
}

export async function pingOpenAiVoice(
  options: {
    model?: OpenAiVoiceModelId;
    apiKey?: string;
  } = {}
): Promise<{
  ok: boolean;
  provider: 'openai';
  model: OpenAiVoiceModelId;
  latencyMs: number;
  status?: number;
  code?: string;
  message?: string;
}> {
  const model = options.model ?? getOpenAiVoiceModel();
  const start = Date.now();
  try {
    const payload = await createOpenAiResponse({
      instructions: 'Return a brief connectivity acknowledgement.',
      input: 'Respond with OK.',
      model,
      apiKey: options.apiKey,
      enableWebSearch: false,
      reasoningEffort: 'low',
    });
    extractOpenAiVoiceResult(payload);
    return { ok: true, provider: 'openai', model, latencyMs: Date.now() - start };
  } catch (error: unknown) {
    const known =
      error instanceof OpenAiVoiceError
        ? error
        : new OpenAiVoiceError('PROVIDER_FAILURE', 'The OpenAI Voice request failed.');
    return {
      ok: false,
      provider: 'openai',
      model,
      latencyMs: Date.now() - start,
      status: known.status,
      code: known.code,
      message: known.message,
    };
  }
}
