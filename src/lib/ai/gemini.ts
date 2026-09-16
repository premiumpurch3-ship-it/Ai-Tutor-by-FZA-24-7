import { GoogleGenerativeAI } from "@google/generative-ai";

let client: GoogleGenerativeAI | null = null;

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set. Add it to .env.local — see SETUP.md section 9.");
  }
  if (!client) client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return client;
}

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.0-flash";

export function getGeminiModel(systemInstruction?: string) {
  return getClient().getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction,
  });
}

/** Plain single-turn generation. Returns raw text. */
export async function generateText(prompt: string, systemInstruction?: string): Promise<string> {
  const model = getGeminiModel(systemInstruction);
  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Generation that expects a strict JSON object back. Strips markdown code
 * fences defensively (models sometimes wrap JSON in ```json ... ``` even
 * when told not to) and throws a descriptive error on parse failure so
 * calling routes can surface a clean error state instead of crashing.
 */
export async function generateJSON<T>(prompt: string, systemInstruction?: string): Promise<T> {
  const raw = await generateText(
    prompt,
    (systemInstruction ? systemInstruction + "\n\n" : "") +
      "Respond with ONLY a valid JSON object. No markdown, no code fences, no commentary before or after."
  );

  const cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`AI response was not valid JSON: ${cleaned.slice(0, 200)}...`);
  }
}

/** Streaming generation — returns an async iterator of text chunks. */
export async function* streamText(prompt: string, systemInstruction?: string) {
  const model = getGeminiModel(systemInstruction);
  const result = await model.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
