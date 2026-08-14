import type { EngineEvent } from './events';
import type { Message, NarrativeBlock, LogicState, TopologyDelta, FrameValidation, ContextReceipt } from '../../types';

export interface ResolvedTurnTelemetry {
  narrative_blocks?: unknown[];
  engine_thoughts?: string;
  logic_state?: LogicState;
  topologyDelta?: TopologyDelta | null;
  validation?: FrameValidation;
  contextReceipt?: ContextReceipt;
}

export function createEngineHistoryMessage(
  formattedText: string,
  frame: ResolvedTurnTelemetry,
  timestamp: number = Date.now()
): Message {
  return {
    role: 'assistant',
    content: formattedText,
    timestamp,
    blocks: Array.isArray(frame.narrative_blocks)
      ? (frame.narrative_blocks as NarrativeBlock[])
      : undefined,
    engine_thoughts: frame.engine_thoughts,
    logic_state: frame.logic_state,
    topologyDelta: frame.topologyDelta,
    validation: frame.validation,
    contextReceipt: frame.contextReceipt,
  };
}

export function createTurnHistoryEvents(
  commandText: string,
  formattedText: string,
  frame: ResolvedTurnTelemetry,
  timestamp: number = Date.now()
): EngineEvent[] {
  return [
    { type: 'USER_ACTION', payload: commandText },
    {
      type: 'ADD_MESSAGE',
      message: createEngineHistoryMessage(formattedText, frame, timestamp),
    },
  ];
}
