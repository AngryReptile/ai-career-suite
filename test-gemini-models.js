require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModel(modelName) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Say 'hello'");
    console.log(`✅ ${modelName} SUCCESS:`, (await result.response).text().substring(0, 10));
  } catch (err) {
    console.log(`❌ ${modelName} FAILED:`, err.message.substring(0, 100));
  }
}

(async () => {
  await testModel("gemini-flash-latest");
  await testModel("gemini-1.5-flash");
  await testModel("gemini-1.5-pro");
})();
