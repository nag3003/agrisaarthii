import { genkit } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/googleai';

// Initialize Genkit with Google AI plugin
// Note: In a real app, the API key should be handled securely (e.g., via environment variables)
// and ideally AI calls should happen on the backend to protect the key.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.EXPO_PUBLIC_GOOGLE_GENAI_API_KEY,
    }),
  ],
  model: gemini15Flash,
});

/**
 * AgriSaarthi AI Assistant Helper
 * This can be used for local AI tasks if needed, 
 * though primary AI logic remains in the Python backend.
 */
export const askAgriAssistant = async (prompt: string, context?: string) => {
  try {
    const fullPrompt = context 
      ? `Context: ${context}\n\nQuestion: ${prompt}`
      : prompt;

    const response = await ai.generate(fullPrompt);
    return response.text;
  } catch (error) {
    console.error('Genkit Error:', error);
    throw error;
  }
};
