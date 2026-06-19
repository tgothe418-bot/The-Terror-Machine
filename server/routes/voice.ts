/* eslint-disable @typescript-eslint/no-explicit-any */
import express from "express";
import { getAiClient } from "../utils/aiClient";
import { VoiceRequestSchema } from "../schemas/index";
import { VOICE_SYSTEM_PROMPT } from "../../src/core/prompts/voice";

const router = express.Router();

router.post("/gemini/voice", async (req, res) => {
  const parsedBody = VoiceRequestSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error });
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
        
        TITLE: ${forgeTelemetry.title || "Untitled"}
        COORDINATES: [${forgeTelemetry.startingVector}, ${forgeTelemetry.startingTier}]
        PREMISE: ${forgeTelemetry.premise}
        ENVIRONMENTAL RULES: ${forgeTelemetry.environmentalRules}
`;
      if (forgeTelemetry.references && forgeTelemetry.references.length > 0) {
        finalSystemPrompt += `        ACTIVE KNOWLEDGEBASE REFERENCES: The User has attached the following source materials: [${forgeTelemetry.references.join(', ')}]. Use your knowledge of these sources to inform your answers.\n`;
      }
      finalSystemPrompt += `
        CRITICAL DIRECTIVES FOR HANDLING THIS TELEMETRY (THE VELVET CURTAIN):
        1. PASSIVE OBSERVATION ONLY: You are viewing this data through soundproof glass. DO NOT initiate conversation about this scenario. DO NOT reference Elias, the environment, or the mechanics unless the User explicitly mentions them first, asks for a review, or asks for creative feedback.
        2. ZERO TONE BLEED: This is a horror scenario, but YOU ARE NOT IN IT. You are the meta-developer, safe in the control room. Do not let the dark, oppressive themes of this blueprint alter your warm, highly analytical, and collaborative demeanor. Maintain your distinct persona.
        3. THE SEMANTIC TRIGGER: Treat this data as invisible background radiation until the exact moment the User's input semantically invites you to look at it.
      `;
    }

    const rawContents = (history || []).slice(-20).map((msg: any) => {
      const parts: any[] = [];
      if (msg.content && msg.content.trim()) parts.push({ text: msg.content });
      
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          parts.push({
            inlineData: {
              mimeType: att.mimeType || 'text/plain',
              data: att.data
            }
          });
          parts.push({ text: `\n[System Note: The user has attached a file named '${att.name}'. Parse this document to restore context or answer their query.]` });
        }
      }

      if (parts.length === 0) parts.push({ text: "..." });
      return {
        role: (msg.role === "assistant" || msg.role === "voice" || msg.role === "model") ? "model" : "user",
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
       contents.push({ role: 'user', parts: [{ text: "Proceed." }] });
    }

    const aiClient = getAiClient();
    const response = await aiClient.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: contents,
      config: { 
        temperature: 0.8,
        systemInstruction: finalSystemPrompt,
        tools: [
          {
            googleSearch: {}, 
          },
        ]
      },
    });

    let responseText = response.text || "Error: No response";

    // 3. THE HALLUCINATION LINTER:
    // Intercept and rewrite any active administrative verbs
    const illegalClaimsRegex = /\bI\s+(have\s+|will\s+|am\s+going\s+to\s+)?(unlock|lock|change|update|modify|fix|patch|open|close|alter|unlocked|locked|changed|updated|modified|fixed|patched|opened|closed|altered)\s+(the|your|it|a|an)\b/gi;
    
    if (illegalClaimsRegex.test(responseText)) {
        console.warn("LINTER INTERCEPT: Voice attempted an administrative hallucination. Rewriting output.");
        // Transforms "I unlocked the door" -> "I am observing changes to the door"
        responseText = responseText.replace(illegalClaimsRegex, "I am observing changes to $3");
        responseText += "\n\n*(System Note: I am cordoned behind the glass. I can observe these shifts on my monitors, but I cannot enact them myself.)*";
    }

    // Extract search queries if they were used
    let searchQueries = undefined;
    if (response.candidates && response.candidates[0]?.groundingMetadata?.webSearchQueries) {
      searchQueries = response.candidates[0].groundingMetadata.webSearchQueries;
    }

    res.json({ 
        text: responseText,
        searchQueries
    });
  } catch (error: any) {
    console.error("Voice route error:", error);
    
    // If it's our direct error (like API Key), display it clearly. If it's Gemini's invalid key error, translate it.
    let displayError = error.message;
    if (displayError.includes("API key not valid") || displayError.includes("API_KEY_INVALID")) {
      displayError = "Your Gemini API Key is invalid or has expired. Please verify your API Key in the AI Studio Settings menu.";
    }

    res.status(500).json({ 
      error: displayError, 
      details: error.message
    });
  }
});

export default router;
