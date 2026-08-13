import { zodToJsonSchema } from 'zod-to-json-schema';
import { TurnResultSchema } from './server/schemas/engine';

const jsonSchema = zodToJsonSchema(TurnResultSchema);
console.log(JSON.stringify(jsonSchema, null, 2));
