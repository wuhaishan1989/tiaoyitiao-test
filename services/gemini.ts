import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

try {
  if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
} catch (error) {
  console.error("Failed to initialize Gemini API:", error);
}

export const generateGameOverComment = async (score: number): Promise<string> => {
  if (!ai) {
    return `Game Over! You scored ${score}. (AI commentary unavailable)`;
  }

  try {
    const prompt = `
      I just played a simple jumping game where I jump from platform to platform. 
      I scored ${score} points. 
      Provide a very short, witty, sarcastic, or encouraging comment (maximum 15 words) based on this score. 
      If the score is low (< 5), roast me gently. 
      If it's decent (5-20), be mildly impressed. 
      If it's high (> 20), praise me like a god.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || `Well played! Score: ${score}`;
  } catch (error) {
    console.error("Gemini generation error:", error);
    return `Not bad! You scored ${score}.`;
  }
};
