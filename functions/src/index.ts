import { genkit, z } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/googleai';
import { onCallGenkit } from 'firebase-functions/https';
import { defineSecret } from "firebase-functions/params";

// Define the secret for the API key
const googleAIapiKey = defineSecret("GOOGLE_GENAI_API_KEY");

// Initialize Genkit
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: googleAIapiKey.value(),
    }),
  ],
  model: gemini15Flash,
});

// Define a sample flow
const generatePoemFlow = ai.defineFlow(
  {
    name: 'generatePoem',
    inputSchema: z.object({ subject: z.string() }),
    outputSchema: z.object({ poem: z.string() }),
  },
  async ({ subject }: { subject: string }) => {
    const { text } = await ai.generate(`Compose a poem about ${subject}.`);
    return { poem: text };
  }
);

// Expose the flow as a callable function
export const generatePoem = onCallGenkit(
  {
    secrets: [googleAIapiKey],
    authPolicy: (auth: any) => auth?.token?.email_verified ?? false, // Basic auth policy
  },
  generatePoemFlow
);
