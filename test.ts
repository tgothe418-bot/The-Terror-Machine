import { generateStructuredResponse } from './server/utils/aiClient';
import { TurnResultSchema } from './server/schemas/engine';

async function run() {
  try {
    const res = await generateStructuredResponse("test prompt", TurnResultSchema);
    console.log("SUCCESS:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("FAIL:", err);
  }
}
run();
