import dotenv from "dotenv";
import path from "path";

// Load .env file from root directory if present
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config();

import { WhatsAppClientManager } from "@jarvis/whatsapp";
import { ReminderScheduler } from "@jarvis/reminders";
import { createWorkerServer } from "./server";

async function main() {
  console.log("=================================================");
  console.log("  JARVIS WHATSAPP AI ASSISTANT - WORKER SERVER   ");
  console.log("=================================================");

  // 1. Initialize WhatsApp Client
  const waClient = new WhatsAppClientManager();

  // 2. Initialize Reminder Scheduler
  const scheduler = new ReminderScheduler(10000); // Check DB every 10 seconds

  // Register trigger callback: When reminder fires, send WhatsApp message to originating chat
  scheduler.registerTriggerCallback(async (rem) => {
    console.log(`[WorkerMain]: Triggering reminder for chat ${rem.chatId}: "${rem.title}"`);
    const reminderText = `⏰ *REMINDER:* ${rem.title}\n\n${rem.messageToSend}`;
    await waClient.sendMessage(rem.chatId, reminderText);
  });

  // 3. Start Reminder Scheduler Ticker Loop
  scheduler.start();

  // 4. Start Express & Socket.io HTTP Server IMMEDIATELY so dashboard connects instantly
  const server = createWorkerServer(waClient, scheduler);
  const PORT = parseInt(process.env.SERVER_PORT || process.env.PORT || "3001", 10);

  server.listen(PORT, () => {
    console.log(`[Jarvis Server]: Backend API & Socket.io listening on http://localhost:${PORT}`);
  });

  // 5. Initialize WhatsApp Connection asynchronously in background (Non-blocking)
  console.log("[WorkerMain]: Launching Baileys WhatsApp connection in background...");
  waClient.initialize().catch((err) => {
    console.error("[WorkerMain]: WhatsApp Client Init Error:", err);
  });
}

main().catch((err) => {
  console.error("[Fatal Startup Error]:", err);
  process.exit(1);
});
