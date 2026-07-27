import {
  getOrCreateChatPermission,
  logMessage,
  createReminder,
  addAuditLog,
  getMasterSetting,
  markIntroSent,
  getSessionWindowMinutes
} from "@jarvis/database";
import { ChatPermissionMode, MessageDirection, ExecutionStatus, AUDIT_EVENTS, IntentCategory } from "@jarvis/shared";
import { classifyAndProcessUserMessage, generateGeneralResponse } from "@jarvis/ai";
import { parseNaturalTimeExpression } from "@jarvis/reminders";

// Beautiful Clean Message Templates (STRICTLY EMOJI-FREE)
export const URGENT_UPDATE_REPLY = "NOTED: I will make sure Shivansh receives your urgent message immediately.";

export const STANDARD_OFFLINE_REPLY = `Hello,

I am Nox, personal AI assistant to Shivansh Saxena. Shivansh is currently offline and unavailable right now.

Your message has been noted, and he will reply to you as soon as he is back online.

If your message is urgent or important, please resend it starting with "IMP:" so it is highlighted for him immediately.
Or else you can continue texting in order to talk to me!`;

export interface IncomingMessageEvent {
  key: {
    remoteJid: string;
    fromMe?: boolean;
    id: string;
  };
  pushName?: string;
  messageText: string;
  isGroup: boolean;
  mentionedJids?: string[];
}

export interface SendMessageFn {
  (jid: string, text: string): Promise<any>;
}

export type EmitVerificationRequestFn = (payload: {
  requestId: string;
  chatId: string;
  senderName: string;
  incomingMessage: string;
  generatedReply: string;
  isUrgent: boolean;
  type: "URGENT_UPDATE" | "WANTS_TO_TALK";
  timestamp: string;
}) => void;

// In-memory pending verification requests
export const pendingVerificationRequests = new Map<string, {
  chatId: string;
  sendMessage: SendMessageFn;
  generatedReply: string;
  senderName: string;
  incomingMessage: string;
  isUrgent: boolean;
}>();

export async function processIncomingWhatsAppMessage(
  msg: IncomingMessageEvent,
  sendMessage: SendMessageFn,
  emitVerification?: EmitVerificationRequestFn
) {
  // Ignore messages sent by self
  if (msg.key.fromMe) return;

  const jid = msg.key.remoteJid;
  if (!jid) return;

  const senderName = msg.pushName || jid.split("@")[0];
  const messageText = msg.messageText.trim();

  if (!messageText) return;

  // 1. MASTER ON/OFF TOGGLE CHECK
  const masterEnabled = await getMasterSetting();
  if (!masterEnabled) {
    console.log(`[PermissionRouter]: Master AI Assistant is OFF. Ignoring message from ${jid}.`);
    return;
  }

  // 2. CONTACT DISCOVERY & PERMISSION ROUTING
  const chatPermission = await getOrCreateChatPermission(jid, senderName, msg.isGroup);
  const currentMode = chatPermission.mode as unknown as ChatPermissionMode;

  // If message is in a group, only process if bot/owner is mentioned or chat is AI_ENABLED
  if (msg.isGroup && currentMode !== ChatPermissionMode.AI_ENABLED) {
    const isTagged = msg.mentionedJids && msg.mentionedJids.length > 0;
    if (!isTagged) return; // Ignore un-tagged group chatter
  }

  // 3. INACTIVITY SCRATCH BEHAVIOR RULE (DYNAMIC USER-CONFIGURED TIMEOUT):
  // Fetch session window duration from database (default: 2 mins)
  const windowMinutes = await getSessionWindowMinutes();
  const sessionWindowMs = windowMinutes * 60 * 1000;

  const lastIntroTime = chatPermission.introSentAt
    ? new Date(chatPermission.introSentAt).getTime()
    : 0;

  const isScratchSession = Date.now() - lastIntroTime > sessionWindowMs;

  if (isScratchSession) {
    await markIntroSent(jid);
    console.log(`[PermissionRouter]: ${windowMinutes}-minute inactivity reset for ${senderName} (${jid}). Sending initial offline auto-reply once...`);
    await sendMessage(jid, STANDARD_OFFLINE_REPLY);
    return; // Exit completely. Send initial offline auto-reply once, no approval modal.
  }

  // 4. SUBSEQUENT MESSAGES WITHIN SESSION WINDOW:
  const isExplicitUrgent = /^(imp:|important:|urgent:|emergency:)/i.test(messageText);

  // SUB-CASE A: MESSAGE HAS IMP: -> SEND NOTED AUTO-REPLY & LOG TO DB (NO APPROVAL MODAL!)
  if (isExplicitUrgent) {
    await logMessage({
      whatsappMsgId: msg.key.id,
      chatId: jid,
      senderJid: jid,
      senderName,
      direction: MessageDirection.INCOMING,
      content: messageText,
      priority: "HIGH",
      executionStatus: ExecutionStatus.PROCESSED
    });

    await addAuditLog("IMPORTANT_WHATSAPP_MESSAGE", {
      from: senderName,
      chatId: jid,
      content: messageText,
      timestamp: new Date().toISOString()
    });

    console.log(`[URGENT MESSAGE]: High Priority message from ${senderName}: "${messageText}". Auto-replying NOTED.`);

    // Auto-reply urgent confirmation text on WhatsApp
    await sendMessage(jid, URGENT_UPDATE_REPLY);

    // Emit real-time notification payload for Socket.io toast banner & dashboard list update
    if (emitVerification) {
      emitVerification({
        requestId: `urg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        chatId: jid,
        senderName,
        incomingMessage: messageText,
        generatedReply: URGENT_UPDATE_REPLY,
        isUrgent: true,
        type: "URGENT_UPDATE",
        timestamp: new Date().toISOString()
      });
    }
    return;
  }

  // SUB-CASE B: NORMAL SUBSEQUENT MESSAGE WITHIN SESSION WINDOW (WITHOUT IMP:) -> ASK FOR APPROVAL ON PWA POPUP
  console.log(`[PermissionRouter]: Subsequent normal message within ${windowMinutes} mins from ${senderName} (${jid}). Asking for PWA approval...`);

  // Generate AI response proposal (supports Hinglish)
  const aiResult = await classifyAndProcessUserMessage(messageText);
  let generatedReply = aiResult.replyMessage;

  switch (aiResult.intent) {
    case IntentCategory.REMINDER: {
      const timeExpr = aiResult.payload.timeExpression || messageText;
      const parsedTime = parseNaturalTimeExpression(timeExpr);
      const title = aiResult.payload.title || "Reminder";
      const messageToSend = aiResult.payload.messageToSend || title;

      await createReminder({
        chatId: jid,
        title,
        messageToSend,
        scheduledAt: parsedTime.scheduledAt,
        recurrence: aiResult.payload.recurrence || parsedTime.recurrence,
        offsetMinutes: aiResult.payload.offsetMinutes || 0
      });

      generatedReply = `REMINDER SET\n\nTitle: ${title}\nScheduled: ${parsedTime.scheduledAt.toLocaleString()}\nRecurrence: ${aiResult.payload.recurrence || "Once"}\n\nI will remind you in this chat when it's time.`;
      break;
    }

    case IntentCategory.GENERAL_CHAT:
    default: {
      if (!generatedReply) {
        generatedReply = await generateGeneralResponse(messageText);
      }
      break;
    }
  }

  const requestId = `req_talk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  pendingVerificationRequests.set(requestId, {
    chatId: jid,
    sendMessage,
    generatedReply: generatedReply || "Thanks for your message. I have noted it for Shivansh.",
    senderName,
    incomingMessage: messageText,
    isUrgent: false
  });

  if (emitVerification) {
    emitVerification({
      requestId,
      chatId: jid,
      senderName,
      incomingMessage: messageText,
      generatedReply: generatedReply || "Thanks for your message. I have noted it for Shivansh.",
      isUrgent: false,
      type: "WANTS_TO_TALK",
      timestamp: new Date().toISOString()
    });
  }
}
