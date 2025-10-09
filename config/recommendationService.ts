import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not set');
}

const ai = new GoogleGenAI({ apiKey });

interface CourseRecommendation {
  courseId: string;
  reason: string;
  relevanceScore: number;
}

export async function getAIRecommendations(
  enrolledCourses: { id: string; title: string; description: string }[],
  availableCourses: { id: string; title: string; description: string }[]
): Promise<CourseRecommendation[]> {
  try {
    if (enrolledCourses.length === 0 || availableCourses.length === 0) {
      return [];
    }

    const enrolledTitles = enrolledCourses.map(c => c.title).join(', ');
    const enrolledDescriptions = enrolledCourses.map(c => `${c.title}: ${c.description}`).join('\n');
    
    const availableCoursesText = availableCourses
      .map(c => `ID: ${c.id}\nTitle: ${c.title}\nDescription: ${c.description}`)
      .join('\n\n');

    const prompt = `You are an AI course recommendation system for a safety certification training platform.

User's Enrolled Courses:
${enrolledDescriptions}

Available Courses (not yet enrolled):
${availableCoursesText}

Based on the user's learning history, recommend the TOP 3 most relevant courses they should take next.

Consider:
1. Learning progression (basic → advanced)
2. Related topics and skills
3. Industry certifications that complement each other
4. Safety domain knowledge building

Return ONLY valid JSON array (no markdown, no code blocks):
[
  {
    "courseId": "course_id_here",
    "reason": "Brief reason why this course is recommended (max 80 chars)",
    "relevanceScore": 0.95
  }
]

IMPORTANT: Return ONLY the JSON array, nothing else.`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [{ parts: [{ text: prompt }] }]
    });

    const responseText = result.text?.trim() || '';
    
    // Clean response
    const jsonContent = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const recommendations = JSON.parse(jsonContent);

    if (!Array.isArray(recommendations)) {
      throw new Error('Invalid recommendations format');
    }

    return recommendations.slice(0, 3);
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    return [];
  }
}