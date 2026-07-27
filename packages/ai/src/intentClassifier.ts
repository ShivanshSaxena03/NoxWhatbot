import { z } from "zod";
import { callOpenRouterAI } from "./llmClient";
import { IntentCategory } from "@jarvis/shared";

export const SHIVANSH_PERSONA_PROMPT = `
You are Nox, the personal AI assistant of Shivansh Saxena.
You are NOT Shivansh Saxena. Never pretend to be him. Always clarify that you are responding on his behalf while he is offline.

LANGUAGE & HINGLISH SUPPORT:
- Seamlessly understand messages written in English OR Hinglish (Hindi in Roman script, e.g. "bhai kaisa hai", "kya chal raha hai", "Shivansh se kab baat hogi", "urgent kaam hai").
- Respond naturally in the matching language (English or polite Hinglish).
- NEVER use emojis in your responses. Keep text clean, clear, and professional.
`;

const IntentResponseSchema = z.object({
  category: z.nativeEnum(IntentCategory),
  isUrgent: z.boolean().default(false),
  confidence: z.number().min(0).max(1).default(0.9),
  replyMessage: z.string().optional(),
  payload: z.object({
    title: z.string().optional(),
    messageToSend: z.string().optional(),
    timeExpression: z.string().optional(),
    recurrence: z.string().optional(),
    offsetMinutes: z.number().optional(),
    key: z.string().optional(),
    value: z.string().optional(),
    category: z.string().optional(),
    query: z.string().optional()
  }).default({})
});

export interface ClassificationResult {
  intent: IntentCategory;
  isUrgent: boolean;
  replyMessage: string;
  payload: Record<string, any>;
}

export async function classifyAndProcessUserMessage(messageText: string): Promise<ClassificationResult> {
  const isExplicitUrgent = /^(imp:|important:|urgent:|emergency:)/i.test(messageText);

  if (isExplicitUrgent) {
    return {
      intent: IntentCategory.GENERAL_CHAT,
      isUrgent: true,
      replyMessage: "NOTED , I'LL LET SHIVANSH KNOW ABOUT THIS",
      payload: {}
    };
  }

  const prompt = `
  ${SHIVANSH_PERSONA_PROMPT}

  Analyze the following WhatsApp message (which may be in English or Hinglish) and return ONLY a JSON object with classification:

  Categories:
  - REMINDER: User wants to set a reminder or alert (e.g. "remind me to call at 5pm", "kal 3 baje yaad dilana").
  - GENERAL_CHAT: Greeting or general question for Shivansh (e.g. "hello", "bhai kya kar raha hai", "how are you").

  Message to analyze: "${messageText}"

  Respond strictly in JSON format matching schema:
  {
    "category": "GENERAL_CHAT" | "REMINDER",
    "isUrgent": boolean,
    "confidence": 0.9,
    "replyMessage": "Polite response in English or Hinglish (NO EMOJIS)",
    "payload": { ... }
  }
  `;

  try {
    const rawResponse = await callOpenRouterAI([
      { role: "system", content: "You are a JSON classifier for a personal AI assistant. Return valid JSON without markdown wrapping." },
      { role: "user", content: prompt }
    ]);

    const cleanedJson = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanedJson);
    const validated = IntentResponseSchema.parse(parsed);

    return {
      intent: validated.category,
      isUrgent: validated.isUrgent,
      replyMessage: validated.replyMessage || "Thanks for your message. I have noted it for Shivansh.",
      payload: validated.payload
    };
  } catch (error) {
    console.error("[IntentClassifier Error]:", error);
    return {
      intent: IntentCategory.GENERAL_CHAT,
      isUrgent: isExplicitUrgent,
      replyMessage: "Thanks for your message. I have noted it and Shivansh will reply to you once he is back online.",
      payload: {}
    };
  }
}

export async function generateGeneralResponse(messageText: string): Promise<string> {
  const prompt = `
  ${SHIVANSH_PERSONA_PROMPT}

  The user sent the following message on WhatsApp:
  "${messageText}"

  Generate a short, polite auto-reply (1-2 sentences) in the same language (English or Hinglish) explaining that Shivansh is currently offline and you have noted their message for him. Do NOT use emojis.
  `;

  try {
    const response = await callOpenRouterAI([
      { role: "system", content: "You are Nox, Shivansh Saxena's AI assistant." },
      { role: "user", content: prompt }
    ]);
    return response.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim();
  } catch (e) {
    return "Thanks for your message. I have noted it and Shivansh will reply to you once he is back online.";
  }
}
