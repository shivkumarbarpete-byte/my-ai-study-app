import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is missing.' },
        { status: 500 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
    let extractedText = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          {
            inlineData: {
              data: base64Data,
              mimeType: 'application/pdf',
            },
          },
          'Extract all text content from this document accurately. Output ONLY the extracted text.',
        ]);

        extractedText = result.response.text();
        if (extractedText && extractedText.trim()) break;
      } catch (err) {
        console.warn(`Model ${modelName} failed on PDF parse, switching...`);
      }
    }

    if (!extractedText || !extractedText.trim()) {
      return NextResponse.json(
        { error: 'PDF file is empty or text could not be extracted.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ text: extractedText });
  } catch (err) {
    console.error('PDF Parse Error:', err);
    return NextResponse.json(
      { error: err.message || 'PDF parse karne me issue aaya.' },
      { status: 500 }
    );
  }
}