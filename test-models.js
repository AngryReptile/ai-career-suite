const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testApi() {
  const markdown = "Frontend Developer at Google\nSalary: $150k\nLocation: Bangalore.";
  const systemInstruction = "Extract jobs as JSON: { \"type\": \"jobs\", \"data\": [ { \"title\": \"Job\" } ] }";
  
  const modelsToTry = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
    "gemma-2-27b-it",
    "gemma-3-27b-it"
  ];
  
  let lastError;
  for (const modelName of modelsToTry) {
     try {
        console.log("Trying: " + modelName);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const generationConfig = {
          maxOutputTokens: modelName.includes('gemma') ? 3072 : 8192,
          temperature: 0.3,
        };

        const safetySettings = [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

        const finalParts = [{ text: `[SYSTEM INSTRUCTION: ${systemInstruction}]\n\n[USER INPUT]:\n` + markdown }];

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: finalParts }],
          generationConfig,
          safetySettings
        });
        
        console.log("SUCCESS from " + modelName);
        console.log("RAW OUPUT:", result.response.text());
        return;
     } catch (e) {
        console.log(`Failed on ${modelName}:`, e.message);
        lastError = e;
     }
  }
  console.log("ALL MODELS FAILED. Last error:", lastError.message);
}

testApi();
