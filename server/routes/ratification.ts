import { Router, Request, Response } from 'express';
import { EventSpecificationSchema } from '../schemas/engine';
import { ZodError } from 'zod';
import { getAiClient } from '../utils/aiClient';

const router = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post('/ratify', async (req: Request, res: Response): Promise<any> => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid prompt in request body' });
  }

  let attempt = 0;
  let currentPrompt = prompt;

  while (attempt < 3) {
    try {
      const response = await getAiClient().models.generateContent({
        model: "gemini-3.5-pro",
        contents: currentPrompt,
      });
      const llmOutput = response.text || "";

      // Strip markdown formatting if present (e.g., ```json\n...\n```)
      const cleanedOutput = llmOutput.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
      
      // Parse the JSON string
      const parsedJson = JSON.parse(cleanedOutput);

      // Validate using Zod
      const validatedData = EventSpecificationSchema.parse(parsedJson);

      return res.status(200).json(validatedData);
    } catch (error) {
      attempt++;
      
      if (error instanceof ZodError) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const zodErr = error as ZodError<any>;
        console.error(`Attempt ${attempt} - Zod Validation Failed:`, JSON.stringify(zodErr.issues, null, 2));
        currentPrompt = `${prompt}\n\n[SYSTEM REJECTION]: Your previous output failed schema validation. Fix these issues and return strictly valid JSON:\n${JSON.stringify(zodErr.issues)}`;
      } else if (error instanceof SyntaxError) {
        console.error(`Attempt ${attempt} - JSON Parse Error:`, error.message);
        currentPrompt = `${prompt}\n\n[SYSTEM REJECTION]: Your previous output was not valid JSON. Ensure you return ONLY a raw JSON object.`;
      } else {
        console.error(`Attempt ${attempt} - Unexpected error during ratification:`, error);
      }
    }
  }

  console.warn('[CIRCUIT BREAKER TRIPPED] Maximum ratification attempts exceeded.');
  return res.status(406).json({ 
    directive: 'COGNITIVE_REJECTION', 
    fallbackThematic: 'The architecture refuses to resolve.' 
  });
});

export default router;
