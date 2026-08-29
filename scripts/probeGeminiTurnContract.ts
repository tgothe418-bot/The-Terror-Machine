import 'dotenv/config';
import { getAiClient, EngineTurnStructuredResponseContract, parseStructuredTurnResponse } from '../server/utils/aiClient';
import { getGeminiPolicy } from '../server/ai/modelPolicy';

export type ProbeResult =
  | {
      schemaAccepted: true;
      responseReceived: true;
      zodAccepted: true;
    }
  | {
      schemaAccepted: true;
      responseReceived: true;
      zodAccepted: false;
      failureClass: 'TURN_RESULT_VALIDATION';
    }
  | {
      schemaAccepted: false;
      responseReceived: false;
      zodAccepted: false;
      failureClass: 'PROVIDER_SCHEMA_REJECTED';
      providerStatus?: number;
    };

const PROMPT = `You are the Engine narrative generator. Generate an explicit neutral initial TurnResult payload for a solitary protagonist standing in an enclosed chamber.
Return valid JSON matching the schema with these EXACT values:
- narrative_blocks: [{"type": "environmental_description", "content": "The chamber is quiet and dim."}, {"type": "prose", "content": "You stand in the center of the room."}]
- intent_proposal: {"action_kind": "OBSERVE", "pressure_direction": "MAINTAIN", "dramatic_tactic": "NONE", "intent_synergy": "N/A"}
- reconciliation_proposal: {"mode": "CANONICAL", "feasibility": "SUPPORTED", "reason_code": "NONE", "fictional_time_cost": "MOMENT", "authority_alignment": "NOT_APPLICABLE"}
- consequence_proposal: {"mutations": []}
- character_stance_proposal: {"changes": []}
- character_relationship_proposal: {"changes": []}
- character_memory_proposal: {"candidates": []}
- world_memory_proposal: {"candidates": []}
- cast_activity_proposal: {"kind": "NONE"}
- situated_pressure_proposal: {"kind": "NONE"}
- value_state_proposal: {"changes": []}
- character_pursuit_proposal: {"changes": []}
- character_development_proposal: {"changes": []}
- pressure_transition_proposal: {"transitions": []}
- logic_state: {"current_phase": "EXPLORATION", "suggested_tension": 10, "terminal_flags": [], "cast_deltas": []}
- topologyDelta: {"isExpansion": false}`;

async function runProbe(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    console.error(JSON.stringify({ error: 'GEMINI_API_KEY environment variable is required' }));
    process.exit(1);
  }

  const policy = getGeminiPolicy('ENGINE_TURN');
  const contract = EngineTurnStructuredResponseContract;

  const schemaConfig: Record<string, unknown> = {};
  if ('responseJsonSchema' in contract && contract.responseJsonSchema) {
    schemaConfig.responseJsonSchema = contract.responseJsonSchema;
  } else if ('responseSchema' in (contract as unknown as Record<string, unknown>)) {
    schemaConfig.responseSchema = (contract as unknown as Record<string, unknown>).responseSchema;
  }

  let response;
  try {
    response = await getAiClient().models.generateContent({
      model: policy.model,
      contents: [{ role: 'user', parts: [{ text: PROMPT }] }],
      config: {
        thinkingConfig: {
          thinkingLevel: policy.thinkingLevel,
        },
        responseMimeType: 'application/json',
        ...schemaConfig,
      },
    });
  } catch (err: unknown) {
    const status =
      typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status: unknown }).status === 'number'
        ? (err as { status: number }).status
        : 400;

    const failureResult: ProbeResult = {
      schemaAccepted: false,
      responseReceived: false,
      zodAccepted: false,
      failureClass: 'PROVIDER_SCHEMA_REJECTED',
      providerStatus: status,
    };
    console.log(JSON.stringify(failureResult, null, 2));
    return;
  }

  const rawText = response.text || '';
  if (!rawText.trim()) {
    const emptyResult: ProbeResult = {
      schemaAccepted: true,
      responseReceived: false,
      zodAccepted: false,
      failureClass: 'PROVIDER_SCHEMA_REJECTED',
      providerStatus: 500,
    };
    console.log(JSON.stringify(emptyResult, null, 2));
    return;
  }

  try {
    parseStructuredTurnResponse(rawText, contract.zodSchema, contract.normalizeProviderPayload);
    const successResult: ProbeResult = {
      schemaAccepted: true,
      responseReceived: true,
      zodAccepted: true,
    };
    console.log(JSON.stringify(successResult, null, 2));
  } catch {
    const zodFailResult: ProbeResult = {
      schemaAccepted: true,
      responseReceived: true,
      zodAccepted: false,
      failureClass: 'TURN_RESULT_VALIDATION',
    };
    console.log(JSON.stringify(zodFailResult, null, 2));
  }
}

runProbe();
