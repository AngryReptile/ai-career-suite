import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock_key_to_avoid_crash_on_build');

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateWithRetry(
  promptOrParts: any, 
  systemInstruction?: string,
  maxRetries: number = 3
) {
  // DISCOVERED STABLE MODELS: Based on API probe
  // Primary: gemini-flash-latest (High speed, multi-modal)
  // Backup: gemini-pro-latest (High intelligence)
  // Fallback: gemma-3-27b-it (Very available but text-only)
  const modelsToTry = ["gemini-flash-latest", "gemini-pro-latest", "gemma-3-27b-it"];
  let lastError = null;

  for (const modelName of modelsToTry) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        const model = genAI.getGenerativeModel({ 
           model: modelName,
           ...(systemInstruction ? { systemInstruction } : {})
        });

        const generationConfig = {
          maxOutputTokens: 8192,
          temperature: 0.3,
        };

        const parts = Array.isArray(promptOrParts) 
          ? promptOrParts 
          : [{ text: typeof promptOrParts === 'string' ? promptOrParts : JSON.stringify(promptOrParts) }];

        // Important: Gemma models don't support inlineData (multi-modal)
        // If we are using a gemma model, we must strip non-text parts to prevent crash
        const filteredParts = modelName.includes('gemma') 
          ? parts.filter((p: any) => p.text) 
          : parts;

        if (filteredParts.length === 0) {
           break; // Move to next model if this one can't handle the data
        }

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: filteredParts }],
          generationConfig
        });
        
        return result; // Success!
      } catch (error: any) {
        lastError = error;
        const isRateLimit = error?.message?.includes('429') || error?.message?.includes('503');
        const isNotFound = error?.message?.includes('404');

        if (isRateLimit && attempt < maxRetries - 1) {
          attempt++;
          const waitTime = Math.pow(2, attempt) * 1000;
          await delay(waitTime);
        } else if (isNotFound) {
          break; // Move to next model in list
        } else {
          break; // Move to next model
        }
      }
    }
  }

  throw lastError || new Error("All AI models are currently unavailable. Please check your Gemini API key.");
}
