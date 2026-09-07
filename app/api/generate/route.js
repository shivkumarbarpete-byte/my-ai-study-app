import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  try {
    const { text } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: '.env.local file mein GEMINI_API_KEY missing hai.' },
        { status: 500 }
      );
    }

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Please provide study notes.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `
      You are an expert AI tutor. Analyze the following study material and generate a complete study package in strict JSON format.

      Return ONLY a JSON object with this exact structure:
      {
        "topic": "Main Topic Name",
        "cards": [
          {
            "id": 1,
            "question": "Clear Flashcard Question",
            "answer": "Direct concise answer",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctIndex": 0,
            "explanation": "Detailed step-by-step explanation"
          }
        ],
        "mindmap": "graph TD\\n  A[Main Topic] --> B[Sub Concept 1]\\n  A --> C[Sub Concept 2]"
      }

      Notes Content:
      "${text.slice(0, 10000)}"
    `;

    // Updated active models with gemini-3.6-flash
    const modelsToTry = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
    let responseText = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: 'application/json' },
        });

        const result = await model.generateContent(prompt);
        responseText = result.response.text();
        if (responseText) break;
      } catch (err) {
        console.warn(`Model ${modelName} failed/deprecated, trying next model...`);
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error('Failed to generate output from available AI models.');
    }

    const cleanedResponse = responseText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsedData = JSON.parse(cleanedResponse);
    return NextResponse.json(parsedData);
  } catch (err) {
    console.error('API Generate Error:', err);
    return NextResponse.json(
      { error: err.message || 'Generation failed.' },
      { status: 500 }
    );
  }
}