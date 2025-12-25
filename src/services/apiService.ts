
import { fileToBase64, getEnv } from "./utils";
import type { ServiceConfig } from "../types";

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
  let cleaned = url.trim();
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
};

/**
 * Step 1: Vision Analysis (Universal OpenAI-compatible chat/completions)
 */
export const describeImage = async (
  file: File, 
  config: ServiceConfig,
  onStreamUpdate?: (text: string) => void
): Promise<string> => {
  const apiKey = config.apiKey || getEnv('API_KEY');
  let baseUrl = cleanBaseUrl(config.baseUrl || getEnv('BASE_URL'));
  
  if (!apiKey) throw new Error("Missing API Key for analysis node.");
  if (!baseUrl) throw new Error("Missing Base URL for analysis node.");

  const base64Data = await fileToBase64(file);
  const model = config.model || 'gpt-4o-mini'; // Default placeholder
  
  const payload = {
    model: model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: config.systemInstruction || "Analyze this image and output a detailed prompt for generating a similar image. Only output the prompt." },
          { 
            type: "image_url", 
            image_url: { url: `data:${file.type};base64,${base64Data}` } 
          }
        ]
      }
    ],
    stream: !!onStreamUpdate
  };

  const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey.trim()}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Vision API Error (${response.status}): ${errText}`);
  }

  if (onStreamUpdate && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));
      
      for (const line of lines) {
        const message = line.replace(/^data: /, '');
        if (message === '[DONE]') break;
        try {
          const parsed = JSON.parse(message);
          const delta = parsed.choices[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onStreamUpdate(fullText);
          }
        } catch (e) {
          // Skip invalid chunks
        }
      }
    }
    return fullText;
  } else {
    const data = await response.json();
    return data.choices[0]?.message?.content || "No analysis result found.";
  }
};

/**
 * Step 2: Image Generation (Universal OpenAI-compatible images/generations)
 */
export const generateVariation = async (originalFile: File, prompt: string, config: ServiceConfig): Promise<string> => {
  const apiKey = config.apiKey || getEnv('API_KEY');
  let baseUrl = cleanBaseUrl(config.baseUrl || getEnv('BASE_URL'));

  if (!apiKey) throw new Error("Missing API Key for generation node.");
  if (!baseUrl) throw new Error("Missing Base URL for generation node.");

  const model = config.model || 'flux.1';
  
  // Map internal ratios to standard sizes if needed, or keep raw
  const payload = {
    model: model,
    prompt: prompt,
    size: config.aspectRatio || "1024x1024",
    n: 1
  };

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
    throw new Error(`Image Gen Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const url = data.data?.[0]?.url || data.url;
  
  if (!url && data.data?.[0]?.b64_json) {
    return `data:image/png;base64,${data.data[0].b64_json}`;
  }

  if (!url) throw new Error("No image URL returned from provider.");
  return url;
};
