import OpenAI from "openai";

export function getOpenRouterClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_SITE_NAME || "Jarvis WhatsApp Assistant"
    }
  });
}

export function getPreferredModel(): string {
  return process.env.OPENROUTER_MODEL || "openrouter/auto";
}

export const FALLBACK_MODELS = [
  "openrouter/auto",
  "openai/gpt-4o-mini",
  "google/gemini-2.5-flash",
  "anthropic/claude-3.5-sonnet"
];

export async function callOpenRouterAI(messages: { role: string; content: string }[]): Promise<string> {
  const client = getOpenRouterClient();
  const model = getPreferredModel();

  try {
    const response = await client.chat.completions.create({
      model,
      messages: messages as any,
      temperature: 0.7
    });
    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("[LLMClient Error]:", error);
    throw error;
  }
}
