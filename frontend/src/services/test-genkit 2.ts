import { gemini15Flash, googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from frontend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Configure a Genkit instance
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.EXPO_PUBLIC_GOOGLE_GENAI_API_KEY,
    }),
  ],
  model: gemini15Flash, // set default model
});

// Define the flow
export const helloFlow = ai.defineFlow('helloFlow', async (name: string) => {
  // make a generation request
  const { text } = await ai.generate(`Hello Gemini, my name is ${name}`);
  return text;
});

// If running directly as a script
if (require.main === module) {
  helloFlow('Chris')
    .then((text) => {
      console.log('--- AI Response ---');
      console.log(text);
      console.log('-------------------');
    })
    .catch((err) => {
      console.error('Error running flow:', err);
    });
}
