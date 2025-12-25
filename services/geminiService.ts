import { GoogleGenAI, Type } from "@google/genai";

// Always use the API key from process.env.API_KEY directly in the constructor.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const summarizeArticle = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Please provide a concise, academic summary (approx. 3-4 sentences) of the following research paper content. Focus on the core hypothesis and conclusion.\n\n${text}`,
      config: {
        // Correct compliance for setting maxOutputTokens alongside thinkingBudget for Gemini 3 models
        maxOutputTokens: 200,
        thinkingConfig: { thinkingBudget: 100 },
        temperature: 0.5,
      }
    });

    return response.text || "No summary generated.";
  } catch (error) {
    console.error("Error summarizing article:", error);
    return "Failed to generate summary. Please try again later.";
  }
};

export const structureArticle = async (rawText: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a professional research paper editor. Convert the following raw text into a beautifully structured Markdown blog post for "Dan Papers".
      
      CRITICAL INSTRUCTIONS:
      1. Identify and preserve all TABLES. Format them exactly in Markdown | Header | format.
      2. If you find tabular data described in text, convert it into a Markdown table.
      3. Identify any architecture descriptions or charts and format them inside fenced code blocks (using \`\`\`).
      4. Create a compelling Title, a 1-sentence Abstract (Subtitle), and 3-5 relevant research Tags.
      5. Clean up extraction artifacts (broken lines, weird characters).
      6. Use academic headers (#, ##).

      RAW TEXT TO PROCESS:
      ${rawText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            content: { type: Type.STRING }
          },
          required: ["title", "subtitle", "tags", "content"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error structuring article:", error);
    return null;
  }
};