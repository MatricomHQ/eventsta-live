
import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("Gemini API key not found. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const generateEventDescription = async (title: string, currentDescription: string): Promise<string> => {
  if (!API_KEY) {
    return Promise.resolve("AI functionality is disabled. Please configure your API key.");
  }
  
  try {
    const prompt = `Rewrite and improve this event description to be more compelling, exciting, and professional. Keep it to 2-3 sentences.
Event Title: "${title}"
Current Description: "${currentDescription || 'No description provided yet.'}"

Do not use markdown in your response.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating event description:", error);
    return "There was an error generating the description.";
  }
};

export const generateEventImage = async (title: string, description: string): Promise<string> => {
    if (!API_KEY) {
        // Return a placeholder if AI is disabled
        return Promise.resolve("https://picsum.photos/seed/ai-disabled/1024/768");
    }

    try {
        const prompt = `Create a vibrant, abstract, and visually stunning event flyer image for an event titled "${title}". Description: "${description}". The image should be suitable as a promotional background. It needs to be high-energy and eye-catching. Do not include any text, letters, or words in the image.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image data found in response");

    } catch (error) {
        console.error("Error generating event image:", error);
        // Return a placeholder on error
        return "https://picsum.photos/seed/ai-error/1024/768";
    }
};