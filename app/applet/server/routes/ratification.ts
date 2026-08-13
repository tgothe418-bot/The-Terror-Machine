import express from 'express';
import { EventSpecificationSchema } from '../schemas/engine';
import { ZodError } from 'zod';

const router = express.Router();

router.post('/ratify', (req, res) => {
  try {
    const { llmOutput } = req.body;

    if (!llmOutput || typeof llmOutput !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid llmOutput in request body' });
    }

    // Strip markdown formatting if present (e.g., ```json\n...\n```)
    const cleanedOutput = llmOutput.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
    
    // Parse the JSON string
    const parsedJson = JSON.parse(cleanedOutput);

    // Validate using Zod
    const validatedData = EventSpecificationSchema.parse(parsedJson);

    return res.status(200).json(validatedData);
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('Zod Validation Failed:', JSON.stringify(error.errors, null, 2));
      return res.status(406).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }

    if (error instanceof SyntaxError) {
      console.error('JSON Parse Error:', error.message);
      return res.status(406).json({ 
        error: 'Invalid JSON format' 
      });
    }

    console.error('Unexpected error during ratification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
