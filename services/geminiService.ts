
import { GoogleGenAI } from "@google/genai";
import { fileToBase64, getEnv } from "./utils";
import type { ServiceConfig } from "../types";

// Helper to handle fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 120000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

const cleanBaseUrl = (url?: string) => {
  if (!url) return "";
  return url.replace(/\/$/, ""); 
};

/**
 * Step 1: Reverse Prompting (Vision Analysis)
 * Uses Gemini-3-Flash to "understand" the image.
 */
export const describeImage = async (
  file: File, 
  config: ServiceConfig,
  onStreamUpdate?: (text: string) => void
): Promise<string> => {
  let apiKey = config.apiKey || getEnv('API_KEY');
  if (!apiKey) throw new Error("Missing Gemini API Key for Analysis step.");
  
  const clientConfig: any = { apiKey: apiKey.trim() };
  let baseUrl = config.baseUrl || getEnv('GEMINI_BASE_URL') || getEnv('BASE_URL');

  if (baseUrl && baseUrl.trim().length > 0) {
      clientConfig.baseUrl = cleanBaseUrl(baseUrl);
  }

  const ai = new GoogleGenAI(clientConfig);
  const base64Data = await fileToBase64(file);
  
  const model = config.model || 'gemini-3-flash-preview';
  const promptText = "Analyze this image and provide a high-quality, detailed descriptive prompt that could be used to recreate a similar image. Focus on artistic style, subject, lighting, and composition. Output only the prompt text.";

  try {
    const streamResponse = await ai.models.generateContentStream({
      model: model,
      contents: {
        parts: [
          { inlineData: { mimeType: file.type, data: base64Data } },
          { text: promptText }
        ]
      },
      config: { systemInstruction: config.systemInstruction }
    });

    let fullText = "";
    for await (const chunk of streamResponse) {
      if (chunk.text) {
        fullText += chunk.text;
        if (onStreamUpdate) onStreamUpdate(fullText);
      }
    }
    return fullText || "Analysis failed to produce a prompt.";
  } catch (error: any) {
    throw new Error(`Step 1 (Gemini Vision) Failed: ${error.message}`);
  }
};

/**
 * Step 2: Generation (Text-to-Image)
 * Uses Gemini-3-Pro-Image (or Flash Image) to create the new image.
 */
export const generateVariation = async (originalFile: File, prompt: string, config: ServiceConfig): Promise<string> => {
  let apiKey = config.apiKey || getEnv('API_KEY');
  if (!apiKey) throw new Error("Missing Gemini API Key for Generation step.");

  // Resolve API Endpoint
  let baseUrl = config.baseUrl || getEnv('GENERATION_BASE_URL') || getEnv('BASE_URL');
  baseUrl = cleanBaseUrl(baseUrl?.trim());
  
  // Default to a common Gemini Image proxy if no base URL provided
  if (!baseUrl) baseUrl = "https://api.apicore.ai/v1"; 

  const model = config.model?.trim() || 'gemini-3-pro-image-preview';
  const finalPrompt = config.systemInstruction 
    ? `${config.systemInstruction}\n\nTask: Generate an image based on this description: ${prompt}`
    : prompt;

  const payload = {
    model: model,
    prompt: finalPrompt,
    aspectRatio: config.aspectRatio || "16:9",
    imageSize: "1K" 
  };

  try {
    const response = await fetchWithTimeout(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Step 2 (Gemini Image) Failed: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    // Support multiple response formats (Standard or Proxy)
    const imgUrl = data.data?.[0]?.url || data.url || data.images?.[0];
    if (imgUrl) return imgUrl;

    if (data.data?.[0]?.b64_json) {
       return `data:image/png;base64,${data.data[0].b64_json}`;
    }

    throw new Error("Could not find image URL in Gemini response.");
  } catch (error: any) {
    throw new Error(`Step 2 (Gemini Image) Error: ${error.message}`);
  }
};
