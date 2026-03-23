require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemInstruction = `
You are an elite, autonomous Career & Research AI Agent. 
You have been provided with RAW MARKDOWN scraped directly from the web.
Your strict task is to extract data and structure it into a perfect JSON format.

If the markdown contains JOB LISTINGS, format as:
{
  "type": "jobs",
  "data": [
    {
      "id": "generate-random-id",
      "title": "Job Title",
      "company": "Company Name",
      "location": "Location",
      "salary": "Extracted salary or 'Competitive'",
      "experience": "Required experience",
      "source_url": "The exact URL to apply",
      "match_score": 70,
      "ai_insight": "A customized 1-sentence insight",
      "tags": ["Tag1", "Tag2"]
    }
  ]
}
`;

async function runTest() {
  const model = genAI.getGenerativeModel({ 
    model: "gemma-3-27b-it", // Forces the lowest fallback model that crashes
    systemInstruction 
  });

  const dummyMarkdown = "Frontend Developer at Google\nSalary: $150k\nLocation: Bangalore. Welcome to google!";
  
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: "RAW SCRAPED MARKDOWN:\n\n" + dummyMarkdown }] }],
    generationConfig: {
      maxOutputTokens: 2000,
      temperature: 0.3,
      responseMimeType: "application/json"
    }
  });

  const text = (await result.response).text();
  console.log("LLM RAW OUTPUT:");
  console.log(text);
  
  try {
    JSON.parse(text);
    console.log("JSON PARSED CORRECTLY!");
  } catch(e) {
    console.log("JSON PARSE CRASHED:", e.message);
  }
}

runTest();
