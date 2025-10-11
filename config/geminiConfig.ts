import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export interface GenerateQuizParams {
  pdfUrl: string;
  language: 'english' | 'sinhala' | 'tamil';
  subtopicTitle: string;
}

export const generateQuizFromPDF = async (params: GenerateQuizParams) => {
  const { pdfUrl, language, subtopicTitle } = params;

  const languageMap = {
    english: 'English',
    sinhala: 'Sinhala',
    tamil: 'Tamil'
  };

  try {
    // Download PDF and convert to base64
    const response = await fetch(pdfUrl);
    const blob = await response.blob();
    
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const prompt = `Based on this PDF document about "${subtopicTitle}", generate exactly 10 multiple-choice questions in ${languageMap[language]} language.

Requirements:
1. Generate exactly 10 questions
2. Each question must have exactly 4 options
3. Questions should test understanding of the material
4. Mark the correct answer index (0-3)
5. Make questions practical and relevant
6. Return ONLY valid JSON in this exact format:

[
  {
    "question": "Question text here?",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correctAnswer": 0
  }
]

Return only the JSON array, no additional text or markdown.`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: [
        {
          parts: [
            {
              text: prompt
            },
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64
              }
            }
          ]
        }
      ]
    });

    const responseText = result.text?.trim() || '';
    
    // Remove markdown code blocks if present
    const jsonContent = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    // Parse JSON
    const questions = JSON.parse(jsonContent);
    
    // Validate
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid quiz format received from Gemini');
    }

    return questions;
  } catch (error) {
    console.error('Error generating quiz with Gemini:', error);
    throw error;
  }
};