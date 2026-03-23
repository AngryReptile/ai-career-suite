require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function main() {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      tools: [{ googleSearch: {} }]
    });
    const result = await model.generateContent("What is Apple's latest product announcement today?");
    console.log(result.response.text());
  } catch(e) { console.error(e.message); }
}
main();
