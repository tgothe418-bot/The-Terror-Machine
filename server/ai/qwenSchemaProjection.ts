import { turnResponseSchema } from './geminiTurnSchema';

export type StandardJsonSchema = Readonly<Record<string, unknown>>;

export function projectGeminiSchemaToStandardJsonSchema(
  input: Readonly<Record<string, unknown>>
): StandardJsonSchema {
  function convertNode(node: unknown): unknown {
    if (node === null || typeof node !== 'object') {
      return node;
    }
    if (Array.isArray(node)) {
      return node.map((item) => convertNode(item));
    }

    const src = node as Record<string, unknown>;
    const isNullable = Boolean(src.nullable);

    // Build the non-nullable converted representation first
    const out: Record<string, unknown> = {};

    // 1. Handle type conversion
    const rawType = src.type;
    let convertedType: string | undefined;
    if (typeof rawType === 'string') {
      const lower = rawType.toLowerCase();
      if (['object', 'array', 'string', 'integer', 'number', 'boolean', 'null'].includes(lower)) {
        convertedType = lower;
        out.type = lower;
      }
    }

    // 2. Handle enum
    if (Array.isArray(src.enum)) {
      if (convertedType === 'integer') {
        out.enum = src.enum.map((v) => (typeof v === 'string' ? parseInt(v, 10) : v));
      } else {
        out.enum = [...src.enum];
      }
    }

    // 3. Handle format (preserve unless format === 'enum')
    if (typeof src.format === 'string' && src.format !== 'enum') {
      out.format = src.format;
    }

    // 4. Handle string / numeric constraints (converting numeric string values to number)
    for (const numKey of ['minLength', 'maxLength', 'minItems', 'maxItems', 'minimum', 'maximum']) {
      if (src[numKey] !== undefined) {
        const val = src[numKey];
        out[numKey] = typeof val === 'string' ? Number(val) : val;
      }
    }

    // 5. Handle description and pattern
    if (typeof src.description === 'string') out.description = src.description;
    if (typeof src.pattern === 'string') out.pattern = src.pattern;

    // 6. Handle required
    if (Array.isArray(src.required)) {
      out.required = [...src.required];
    }

    // 7. Handle properties (for object)
    if (src.properties && typeof src.properties === 'object') {
      const convertedProps: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(src.properties as Record<string, unknown>)) {
        if (val !== undefined) {
          convertedProps[key] = convertNode(val);
        }
      }
      out.properties = convertedProps;
    }

    // 8. Handle items (for array)
    if (src.items !== undefined) {
      out.items = convertNode(src.items);
    }

    // 9. Handle anyOf
    if (Array.isArray(src.anyOf)) {
      out.anyOf = src.anyOf.map((member) => convertNode(member));
    }

    // 10. Handle additionalProperties for objects
    if (convertedType === 'object' || out.properties !== undefined) {
      if (src.additionalProperties !== undefined) {
        out.additionalProperties = src.additionalProperties;
      } else {
        out.additionalProperties = false;
      }
    }

    // 11. Handle nullable wrapping
    if (isNullable) {
      if (Array.isArray(out.anyOf)) {
        const hasNull = out.anyOf.some(
          (m) => typeof m === 'object' && m !== null && (m as Record<string, unknown>).type === 'null'
        );
        if (!hasNull) {
          out.anyOf = [...out.anyOf, { type: 'null' }];
        }
        return out;
      } else {
        return {
          anyOf: [out, { type: 'null' }],
        };
      }
    }

    return out;
  }

  return convertNode(input) as StandardJsonSchema;
}

export const qwenTurnResponseSchema: StandardJsonSchema =
  projectGeminiSchemaToStandardJsonSchema(
    turnResponseSchema as unknown as Readonly<Record<string, unknown>>
  );
