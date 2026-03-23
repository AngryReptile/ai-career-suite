import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock_key_to_avoid_crash_on_build');

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateWithRetry(
  promptOrParts: any,
  systemInstruction?: string,
  maxRetries: number = 5
) {
  // DISCOVERED STABLE MODELS: Based on API probe
  // Primary: gemini-2.0-flash (High speed, multi-modal)
  // Backup: gemini-1.5-flash (Extremely reliable fallback)
  const modelsToTry = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
    "gemma-2-27b-it",
    "gemma-3-27b-it"
  ];
  let lastError = null;

  for (const modelName of modelsToTry) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        const model = genAI.getGenerativeModel({ 
           model: modelName
        });

        const generationConfig: any = {
          maxOutputTokens: modelName.includes('gemma') ? 3072 : 8192,
          temperature: 0.3,
        };

        const parts = Array.isArray(promptOrParts) 
          ? promptOrParts 
          : [{ text: typeof promptOrParts === 'string' ? promptOrParts : JSON.stringify(promptOrParts) }];

        // Important: Gemma models have much smaller context windows (e.g. 15k tokens) vs Gemini Flash (1M tokens)
        // If we are using a gemma model, we must slice the text down to ~50,000 characters to prevent 429 Quota Exceeded errors
        const filteredParts = parts
          .filter((p: any) => p.text || p.inlineData)
          .map((p: any) => {
            if (p.text && modelName.includes('gemma') && p.text.length > 25000) {
               const sections = p.text.split('---');
               if (sections.length > 1) {
                  const limitPerSection = Math.floor(25000 / sections.length);
                  return { text: sections.map((s: string) => s.substring(0, limitPerSection)).join('\n\n---\n\n') };
               }
               return { text: p.text.substring(0, 25000) };
            }
            return p;
          });

        if (filteredParts.length === 0) {
           break; // Move to next model if this one can't handle the data
        }

        const safetySettings = [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

        const finalParts = systemInstruction 
          ? [{ text: `[SYSTEM INSTRUCTION: ${systemInstruction}]\n\n[USER INPUT]:\n` }, ...filteredParts]
          : filteredParts;

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: finalParts }],
          generationConfig,
          safetySettings
        });
        
        return result; // Success!
      } catch (error: any) {
        lastError = error;
        const isRateLimit = error?.message?.includes('429') || error?.message?.includes('503');
        const isNotFound = error?.message?.includes('404');

        if (isRateLimit && attempt < maxRetries - 1) {
          attempt++;
          // A tiny 2-second delay to prevent spam-banning the API key
          await delay(2000);
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
