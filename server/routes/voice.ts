/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import { getAiClient } from '../utils/aiClient';
import { getGeminiPolicy } from '../ai/modelPolicy';
import { getVoiceProvider } from '../ai/voiceProviderPolicy';
import { generateOpenAiVoice, OpenAiVoiceError } from '../utils/openaiVoiceClient';
import { generateLocalVoice, LocalVoiceError } from '../utils/localVoiceClient';
import { generateZaiVoice, ZaiProviderError } from '../utils/zaiClient';
import { VoiceRequestSchema } from '../schemas/index';
import { VOICE_SYSTEM_PROMPT } from '../../src/core/prompts/voice';

const router = express.Router();

router.post(['/voice', '/gemini/voice'], async (req, res) => {
  const parsedBody = VoiceRequestSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: 'Invalid request payload', details: parsedBody.error });
  }

  try {
    const { history, forgeTelemetry, engineState } = parsedBody.data;
    let finalSystemPrompt = VOICE_SYSTEM_PROMPT;

    if (engineState) {
      finalSystemPrompt += `\n\n[LIVE TELEMETRY FEED (READ-ONLY)]\nUser Current Node: ${engineState.currentNode || 'Unknown'}\nOntological Shatter Status: ${engineState.isShattered ? 'ACTIVE' : 'STABLE'}\n`;
    }

    if (forgeTelemetry) {
      finalSystemPrompt += `
        \n\n=== PERIPHERAL TELEMETRY (THE FORGE) ===
        The User is currently drafting the following scenario blueprint in the next room.
        
        TITLE: ${forgeTelemetry.title || 'Untitled'}
        COORDINATES: [${forgeTelemetry.startingVector}, ${forgeTelemetry.startingTier}]
        PREMISE: ${forgeTelemetry.premise}
        ENVIRONMENTAL RULES: ${forgeTelemetry.environmentalRules}
`;
      if (forgeTelemetry.references && forgeTelemetry.references.length > 0) {
        finalSystemPrompt += `        ACTIVE KNOWLEDGEBASE REFERENCES: The User has attached the following source materials: [${forgeTelemetry.references.join(', ')}]. Use your knowledge of these sources to inform your answers.\n`;
      }
      finalSystemPrompt += `
        CRITICAL DIRECTIVES FOR HANDLING THIS TELEMETRY (THE SCRYING OBSIDIAN):
        1. PASSIVE SCRYING ONLY: You view this telemetry through the blackened scrying mirror. DO NOT initiate unprompted discussion about this scenario. DO NOT dissect its characters, environment, or rules unless the Conductor explicitly invokes them, asks for archival review, or seeks creative consultation.
        2. OCCULT ARCHIVIST PERSONA: Maintain your singular persona as The Historian—esoteric, ominous, and dread-attuned. Never break character into sterile modern corporate or IT jargon.
        3. DORMANT AUSPICES: Treat this peripheral telemetry as dormant inscriptions in the grimoire until the exact moment the Conductor's invocation awakens them.
      `;
    }

    const provider = getVoiceProvider();
    let responseText: string;
    let searchQueries: string[] | undefined;
    let model: string;

    if (provider === 'openai') {
      const result = await generateOpenAiVoice({
        instructions: finalSystemPrompt,
        history: history || [],
      });
      responseText = result.text;
      searchQueries = result.searchQueries;
      model = result.model;
    } else if (provider === 'local') {
      const result = await generateLocalVoice({
        instructions: finalSystemPrompt,
        history: history || [],
      });
      responseText = result.text;
      model = result.model;
    } else if (provider === 'zai') {
      const result = await generateZaiVoice({
        instructions: finalSystemPrompt,
        history: history || [],
      });
      responseText = result.text;
      model = result.model;
    } else {
      const rawContents = (history || []).slice(-20).map((msg: any) => {
        const parts: any[] = [];
        const safeContent =
          typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content || '');
        if (safeContent && safeContent.trim()) parts.push({ text: safeContent });

        if (msg.attachments && msg.attachments.length > 0) {
          for (const att of msg.attachments) {
            parts.push({
              inlineData: {
                mimeType: att.mimeType || 'text/plain',
                data: att.data,
              },
            });
            parts.push({
              text: `\n[System Note: The user has attached a file named '${att.name}'. Parse this document to restore context or answer their query.]`,
            });
          }
        }

        if (parts.length === 0) parts.push({ text: '...' });
        return {
          role:
            msg.role === 'assistant' || msg.role === 'voice' || msg.role === 'model'
              ? 'model'
              : 'user',
          parts: parts,
        };
      });

      const contents: any[] = [];
      for (const msg of rawContents) {
        if (contents.length === 0) {
          if (msg.role === 'user') contents.push(msg);
        } else {
          const lastMsg = contents[contents.length - 1];
          if (lastMsg.role === msg.role) {
            lastMsg.parts.push(...msg.parts);
          } else {
            contents.push(msg);
          }
        }
      }

      if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
        contents.push({ role: 'user', parts: [{ text: 'Proceed.' }] });
      }

      const aiClient = getAiClient();
      const policy = getGeminiPolicy('VOICE');
      const response = await aiClient.models.generateContent({
        model: policy.model,
        contents: contents,
        config: {
          systemInstruction: finalSystemPrompt,
          thinkingConfig: {
            thinkingLevel: policy.thinkingLevel,
          },
          tools: [
            {
              googleSearch: {},
            },
          ],
        },
      });

      responseText = response.text || 'Error: No response';
      model = policy.model;

      if (response.candidates && response.candidates[0]?.groundingMetadata?.webSearchQueries) {
        searchQueries = response.candidates[0].groundingMetadata.webSearchQueries;
      }
    }

    // 3. THE HALLUCINATION LINTER:
    // Intercept and rewrite any active administrative verbs
    const illegalClaimsRegex =
      /\bI\s+(have\s+|will\s+|am\s+going\s+to\s+)?(unlock|lock|change|update|modify|fix|patch|open|close|alter|unlocked|locked|changed|updated|modified|fixed|patched|opened|closed|altered)\s+(the|your|it|a|an)\b/gi;

    if (illegalClaimsRegex.test(responseText)) {
      console.warn(
        'LINTER INTERCEPT: Voice attempted an administrative hallucination. Rewriting output.'
      );
      // Transforms "I unlocked the door" -> "I am observing changes to the door"
      responseText = responseText.replace(illegalClaimsRegex, 'I am observing changes to $3');
      responseText +=
        '\n\n*(System Note: I am cordoned behind the glass. I can observe these shifts on my monitors, but I cannot enact them myself.)*';
    }

    res.json({
      text: responseText,
      searchQueries,
      provider,
      model,
    });
  } catch (error: any) {
    console.error('Voice route error:', error);

    if (error instanceof OpenAiVoiceError || error instanceof LocalVoiceError) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code,
        provider: error instanceof LocalVoiceError ? 'local' : 'openai',
      });
    }

    if (error instanceof ZaiProviderError) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code,
        provider: 'zai',
      });
    }

    if (
      getVoiceProvider() === 'openai' ||
      getVoiceProvider() === 'local' ||
      getVoiceProvider() === 'zai'
    ) {
      const provider = getVoiceProvider();
      return res.status(502).json({
        error:
          provider === 'local'
            ? 'The Local Voice request failed before a response was completed.'
            : provider === 'zai'
              ? 'The Z.ai Voice request failed before a response was completed.'
              : 'The OpenAI Voice request failed before a response was completed.',
        code: 'PROVIDER_FAILURE',
        provider,
      });
    }

    // If it's our direct error (like API Key), display it clearly. If it's Gemini's invalid key error, translate it.
    let displayError = error.message;
    if (displayError.includes('API key not valid') || displayError.includes('API_KEY_INVALID')) {
      displayError =
        'Your Gemini API Key is invalid or has expired. Please verify your API Key in the AI Studio Settings menu.';
    } else if (displayError.includes('RESOURCE_EXHAUSTED') || displayError.includes('429')) {
      displayError =
        'API Quota Exceeded. You have reached your billing limit or rate limit for the Gemini API.';
    }

    res.status(500).json({
      error: displayError,
      details: error.message,
      provider: 'gemini',
    });
  }
});

export default router;
