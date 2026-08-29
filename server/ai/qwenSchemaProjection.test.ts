import { describe, expect, it } from 'vitest';
import {
  projectGeminiSchemaToStandardJsonSchema,
  qwenTurnResponseSchema,
} from './qwenSchemaProjection';
import { turnResponseSchema } from '../utils/aiClient';
import {
  PERCEPTION_PATHS,
  PRESSURE_OPERATORS,
  AFFECTED_DIMENSIONS,
  PERSISTENCE_TARGETS,
  VALUE_LIFECYCLES,
  VALUE_CONDITIONS,
  VALUE_OPERATIONS,
  PURSUIT_STATUSES,
  PURSUIT_OPERATIONS,
  DEVELOPMENT_DIMENSIONS,
  DEVELOPMENT_OPERATIONS,
  PRESSURE_THREAD_TERMINAL_STATUSES,
} from '../../src/types/horrorGrammar';

describe('Qwen Schema Projection (Packet 1-11A)', () => {
  it('Qwen projection contains standard JSON Schema and no Gemini-only keywords', () => {
    const projected = qwenTurnResponseSchema;

    function checkNode(node: unknown, path = 'root') {
      if (!node || typeof node !== 'object') return;
      const obj = node as Record<string, unknown>;

      expect(obj.nullable, `Key 'nullable' must not exist at ${path}`).toBeUndefined();
      expect(obj.format, `Format 'enum' must not exist at ${path}`).not.toBe('enum');

      if (typeof obj.type === 'string') {
        expect(
          ['object', 'array', 'string', 'integer', 'number', 'boolean', 'null'],
          `Type at ${path} must be standard lowercase`
        ).toContain(obj.type);
      }

      for (const numKey of ['minLength', 'maxLength', 'minItems', 'maxItems', 'minimum', 'maximum']) {
        if (numKey in obj) {
          expect(typeof obj[numKey], `Constraint ${numKey} at ${path} must be numeric`).toBe('number');
        }
      }

      if (obj.type === 'object') {
        expect(obj.additionalProperties, `Object node at ${path} must set additionalProperties: false`).toBe(false);
      }

      if (obj.properties && typeof obj.properties === 'object') {
        for (const [propName, child] of Object.entries(obj.properties as Record<string, unknown>)) {
          checkNode(child, `${path}.properties.${propName}`);
        }
      }
      if (obj.items) {
        checkNode(obj.items, `${path}.items`);
      }
      if (Array.isArray(obj.anyOf)) {
        obj.anyOf.forEach((item, idx) => checkNode(item, `${path}.anyOf[${idx}]`));
      }
    }

    checkNode(projected);

    // Serialization proof
    expect(() => JSON.stringify(projected)).not.toThrow();

    // Idempotency and deep equality
    const projectedAgain = projectGeminiSchemaToStandardJsonSchema(turnResponseSchema as unknown as Readonly<Record<string, unknown>>);
    expect(projectedAgain).toEqual(projected);
  });

  it('Qwen projection preserves every Engine root requirement and HG1 envelope bound', () => {
    const projected = qwenTurnResponseSchema as Record<string, unknown>;
    const props = projected.properties as Record<string, Record<string, unknown>>;
    const required = projected.required as string[];

    const originalProps = (turnResponseSchema as unknown as { properties: Record<string, unknown> }).properties;
    const originalRequired = (turnResponseSchema as unknown as { required: string[] }).required;

    // Root properties and required fields match exactly
    expect(Object.keys(props).sort()).toEqual(Object.keys(originalProps).sort());
    expect([...required].sort()).toEqual([...originalRequired].sort());

    // All six HG1 envelopes root required
    const hg1Fields = [
      'cast_activity_proposal',
      'situated_pressure_proposal',
      'value_state_proposal',
      'character_pursuit_proposal',
      'character_development_proposal',
      'pressure_transition_proposal',
    ];
    for (const field of hg1Fields) {
      expect(required).toContain(field);
    }

    // Relationship delta enum is numeric [-1, 1]
    const relChanges = ((props.character_relationship_proposal.properties as Record<string, unknown>).changes as Record<string, unknown>).items as Record<string, unknown>;
    const deltaProp = (relChanges.properties as Record<string, unknown>).delta as Record<string, unknown>;
    expect(deltaProp.enum).toEqual([-1, 1]);

    // HG1 discriminants and enum sets
    const actAnyOf = props.cast_activity_proposal.anyOf as Array<Record<string, unknown>>;
    expect(actAnyOf).toHaveLength(2);
    const actActive = actAnyOf[1].properties as Record<string, unknown>;
    expect((actActive.perceptionPath as Record<string, unknown>).enum).toEqual([...PERCEPTION_PATHS]);

    const pressAnyOf = props.situated_pressure_proposal.anyOf as Array<Record<string, unknown>>;
    expect(pressAnyOf).toHaveLength(2);
    const pressActive = pressAnyOf[1].properties as Record<string, unknown>;
    expect((pressActive.operator as Record<string, unknown>).enum).toEqual([...PRESSURE_OPERATORS]);
    expect((pressActive.affectedDimension as Record<string, unknown>).enum).toEqual([...AFFECTED_DIMENSIONS]);
    expect((pressActive.persistenceTarget as Record<string, unknown>).enum).toEqual([...PERSISTENCE_TARGETS]);

    const valChanges = ((props.value_state_proposal.properties as Record<string, unknown>).changes as Record<string, unknown>);
    expect(valChanges.maxItems).toBe(3);
    const valItem = (valChanges.items as Record<string, unknown>).properties as Record<string, unknown>;
    expect((valItem.operation as Record<string, unknown>).enum).toEqual([...VALUE_OPERATIONS]);
    expect((valItem.proposedCondition as Record<string, unknown>).enum).toEqual([...VALUE_CONDITIONS]);
    expect((valItem.proposedLifecycle as Record<string, unknown>).enum).toEqual([...VALUE_LIFECYCLES]);

    const purChanges = ((props.character_pursuit_proposal.properties as Record<string, unknown>).changes as Record<string, unknown>);
    expect(purChanges.maxItems).toBe(2);
    const purItem = (purChanges.items as Record<string, unknown>).properties as Record<string, unknown>;
    expect((purItem.operation as Record<string, unknown>).enum).toEqual([...PURSUIT_OPERATIONS]);
    expect((purItem.proposedStatus as Record<string, unknown>).enum).toEqual([...PURSUIT_STATUSES]);

    const devChanges = ((props.character_development_proposal.properties as Record<string, unknown>).changes as Record<string, unknown>);
    expect(devChanges.maxItems).toBe(2);
    const devItem = (devChanges.items as Record<string, unknown>).properties as Record<string, unknown>;
    expect((devItem.operation as Record<string, unknown>).enum).toEqual([...DEVELOPMENT_OPERATIONS]);
    expect((devItem.dimension as Record<string, unknown>).enum).toEqual([...DEVELOPMENT_DIMENSIONS]);

    const transChanges = ((props.pressure_transition_proposal.properties as Record<string, unknown>).transitions as Record<string, unknown>);
    expect(transChanges.maxItems).toBe(2);
    const transItem = (transChanges.items as Record<string, unknown>).properties as Record<string, unknown>;
    expect((transItem.proposedStatus as Record<string, unknown>).enum).toEqual([...PRESSURE_THREAD_TERMINAL_STATUSES]);
  });
});
