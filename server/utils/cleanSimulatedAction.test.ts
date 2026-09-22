import { describe, it, expect } from 'vitest';
import { cleanSimulatedAction } from './localVoiceClient';

describe('Autopilot Anti-Catatonia: cleanSimulatedAction', () => {
  describe('Standard Sanitization', () => {
    it('strips <think> reasoning blocks', () => {
      const raw = '<think>I need to check the door before moving.</think>I reach for the door handle.';
      expect(cleanSimulatedAction(raw)).toBe('I reach for the door handle.');
    });

    it('strips markdown code fences', () => {
      const raw = '```json\n"I turn the valve clockwise."\n```';
      expect(cleanSimulatedAction(raw)).toBe('I turn the valve clockwise.');
    });

    it('strips speaker prefixes and quotation marks', () => {
      expect(cleanSimulatedAction('ME: "I check the gauge."')).toBe('I check the gauge.');
      expect(cleanSimulatedAction('The Player: I grab the flashlight.')).toBe('I grab the flashlight.');
      expect(cleanSimulatedAction('Action: "I sprint toward the exit."')).toBe('I sprint toward the exit.');
    });
  });

  describe('Prompt & Placeholder Echo Rejection', () => {
    it('rejects placeholder tokens', () => {
      expect(cleanSimulatedAction('none')).toBe('');
      expect(cleanSimulatedAction('N/A')).toBe('');
      expect(cleanSimulatedAction('TODO')).toBe('');
      expect(cleanSimulatedAction('placeholder')).toBe('');
      expect(cleanSimulatedAction('no action')).toBe('');
    });

    it('rejects hesitation / inaction tokens', () => {
      expect(cleanSimulatedAction('I wait.')).toBe('');
      expect(cleanSimulatedAction('I hesitate')).toBe('');
      expect(cleanSimulatedAction('I freeze')).toBe('');
      expect(cleanSimulatedAction('I pause.')).toBe('');
      expect(cleanSimulatedAction('I do nothing.')).toBe('');
    });

    it('rejects regurgitated prompt directive and constraint echoes', () => {
      expect(cleanSimulatedAction('[USER_ACTION: OBSERVE]')).toBe('');
      expect(cleanSimulatedAction('[USER_ACTION: WAIT]')).toBe('');
      expect(cleanSimulatedAction('[REASONING CONSTRAINT: Output ONLY the player action]')).toBe('');
      expect(cleanSimulatedAction('[DIRECTIVE: Write your next immediate action]')).toBe('');
      expect(cleanSimulatedAction('[ROLE DIRECTIVE: Act with chilling composure]')).toBe('');
    });
  });

  describe('Spectator-Only vs. Compound Action Discrimination', () => {
    it('rejects passive observation-only sentences', () => {
      expect(cleanSimulatedAction('I observe.')).toBe('');
      expect(cleanSimulatedAction('I watch the door.')).toBe('');
      expect(cleanSimulatedAction('I monitor the telemetry screen.')).toBe('');
      expect(cleanSimulatedAction('I scan around the room.')).toBe('');
      expect(cleanSimulatedAction('continue to observe the corridor')).toBe('');
      expect(cleanSimulatedAction('I glide through the dark.')).toBe('');
      expect(cleanSimulatedAction('I float from the ceiling grates.')).toBe('');
    });

    it('accepts compound actions where observation precedes committed action', () => {
      expect(
        cleanSimulatedAction('I scan the drainage channel, then advance toward the histology door.')
      ).toBe('I scan the drainage channel, then advance toward the histology door.');

      expect(
        cleanSimulatedAction('I observe the creature retreating and immediately wedge the crowbar into the latch.')
      ).toBe('I observe the creature retreating and immediately wedge the crowbar into the latch.');

      expect(
        cleanSimulatedAction('I watch the needle jump on the gauge, then throw the main circuit breaker.')
      ).toBe('I watch the needle jump on the gauge, then throw the main circuit breaker.');
    });

    it('accepts direct physical and dialogue actions', () => {
      expect(cleanSimulatedAction('I grip the utility crowbar and strike the solenoid.')).toBe(
        'I grip the utility crowbar and strike the solenoid.'
      );
      expect(cleanSimulatedAction('"Marcus, stay behind me. I have the breaker."')).toBe(
        'Marcus, stay behind me. I have the breaker.'
      );
    });
  });
});
