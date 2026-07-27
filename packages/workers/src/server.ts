import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { WhatsAppClientManager, pendingVerificationRequests } from "@jarvis/whatsapp";
import { ReminderScheduler } from "@jarvis/reminders";
import {
  listAllChats,
  deleteChatPermission,
  prisma,
  listReminders,
  createReminder,
  getRecentAuditLogs,
  addAuditLog,
  getMasterSetting,
  setMasterSetting,
  getSessionWindowMinutes,
  setSessionWindowMinutes,
  updateChatMode
} from "@jarvis/database";
import { ChatPermissionMode } from "@jarvis/shared";

export function createWorkerServer(waClient: WhatsAppClientManager, scheduler?: ReminderScheduler) {
  const app = express();
  const server = http.createServer(app);

  app.use(cors({ origin: "*" }));
  app.use(express.json());

  const io = new SocketIOServer(server, {
    cors: { origin: "*" }
  });

  // SOCKET.IO AUTHENTICATION MIDDLEWARE
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (token === "authenticated_jarvis_session" || token === "Bearer authenticated_jarvis_session") {
      return next();
    }
    console.log(`[Socket.io Auth]: Connection rejected from ${socket.id} (No valid login token).`);
    return next(new Error("Unauthorized: Login required before connecting."));
  });

  // EXPRESS AUTHENTICATION MIDDLEWARE
  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");
    if (token === "authenticated_jarvis_session") {
      return next();
    }
    return res.status(401).json({ success: false, error: "Unauthorized: Login required." });
  };

  // Authentication Route (Public)
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const expectedUser = process.env.ADMIN_USERNAME || "shivansh";
    const expectedPass = process.env.ADMIN_PASSWORD || "password123";

    if (username === expectedUser && password === expectedPass) {
      return res.json({ success: true, token: "authenticated_jarvis_session" });
    }

    return res.status(401).json({ success: false, error: "Invalid username or password." });
  });

  // ----------------------------------------------------
  // REAL-TIME EVENT BRIDGE & LISTENERS
  // ----------------------------------------------------

  waClient.on("qr", (qrCodeUrl) => {
    console.log("[Socket.io]: Broadcasting fresh WhatsApp QR Code URL to authenticated clients.");
    io.emit("whatsapp_qr", qrCodeUrl);
    io.emit("whatsapp_state", waClient.getState());
  });

  waClient.on("stateChange", (state) => {
    io.emit("whatsapp_state", state);
  });

  waClient.on("verification_request", (payload) => {
    if (payload.type === "URGENT_UPDATE" || payload.isUrgent) {
      console.log(`[Socket.io]: Emitting real-time important_message_received toast notification for ${payload.senderName}`);
      io.emit("important_message_received", payload);
    } else {
      console.log(`[Socket.io]: Emitting PWA full-screen verification request modal for ${payload.requestId}`);
      io.emit("ai_verification_request", payload);
    }
  });

  // ----------------------------------------------------
  // REST API ROUTES (ALL PROTECTED BY REQUIREAUTH)
  // ----------------------------------------------------

  // System Status
  app.get("/api/status", requireAuth, async (req, res) => {
    try {
      const masterEnabled = await getMasterSetting();
      const waState = waClient.getState();
      res.json({
        success: true,
        masterEnabled,
        whatsapp: waState
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Master ON/OFF Setting
  app.get("/api/settings/master", requireAuth, async (req, res) => {
    try {
      const masterEnabled = await getMasterSetting();
      res.json({ success: true, masterEnabled });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/settings/master", requireAuth, async (req, res) => {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== "boolean") {
        return res.status(400).json({ success: false, error: "Field 'enabled' must be boolean." });
      }
      await setMasterSetting(enabled);
      io.emit("master_setting_updated", { masterEnabled: enabled });
      res.json({ success: true, masterEnabled: enabled });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Session Window Timeout Setting
  app.get("/api/settings/session-window", requireAuth, async (req, res) => {
    try {
      const minutes = await getSessionWindowMinutes();
      res.json({ success: true, minutes });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/settings/session-window", requireAuth, async (req, res) => {
    try {
      const { minutes } = req.body;
      const numMinutes = parseInt(minutes, 10);
      if (isNaN(numMinutes) || numMinutes < 1) {
        return res.status(400).json({ success: false, error: "Field 'minutes' must be a positive integer." });
      }
      await setSessionWindowMinutes(numMinutes);
      io.emit("session_window_updated", { minutes: numMinutes });
      res.json({ success: true, minutes: numMinutes });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Chat Permissions & Contacts
  app.get("/api/chats", requireAuth, async (req, res) => {
    try {
      const chats = await listAllChats();
      res.json({ success: true, chats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/chats/:chatId", requireAuth, async (req, res) => {
    try {
      const { chatId } = req.params;
      await deleteChatPermission(chatId);
      io.emit("chat_deleted", { chatId });
      res.json({ success: true, message: `Contact ${chatId} deleted.` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Message Logs
  app.get("/api/logs", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await prisma.messageLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit
      });
      res.json({ success: true, logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reminders
  app.get("/api/reminders", requireAuth, async (req, res) => {
    try {
      const reminders = await listReminders();
      res.json({ success: true, reminders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/reminders", requireAuth, async (req, res) => {
    try {
      const { chatId, title, scheduledAt, recurrence } = req.body;
      const reminder = await createReminder({
        chatId: chatId || "me",
        title,
        messageToSend: title,
        scheduledAt: new Date(scheduledAt),
        recurrence: recurrence || "ONCE"
      });
      res.json({ success: true, reminder });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Human-in-the-Loop AI Verification Route
  app.post("/api/ai/verify", requireAuth, async (req, res) => {
    try {
      const { requestId, action, customReply, chatId } = req.body;
      const pending = pendingVerificationRequests.get(requestId);

      const targetChatId = pending?.chatId || chatId;
      const textToSend = action === "custom" && customReply ? customReply : (pending?.generatedReply || customReply);

      if ((action === "approve" || action === "enable_ai" || action === "custom") && targetChatId && textToSend) {
        if (action === "enable_ai" || action === "approve") {
          await updateChatMode(targetChatId, ChatPermissionMode.AI_ENABLED);
          io.emit("chat_updated", { id: targetChatId, mode: "AI_ENABLED" });
        }

        console.log(`[PWA Verification]: Action "${action}" approved for ${targetChatId}: "${textToSend}"`);
        await waClient.sendMessage(targetChatId, textToSend);

        await addAuditLog("PWA_VERIFICATION_APPROVED", {
          requestId,
          chatId: targetChatId,
          action,
          textToSend
        });
      } else {
        console.log(`[PWA Verification]: Dismissed verification request ${requestId}`);
      }

      if (requestId) {
        pendingVerificationRequests.delete(requestId);
        io.emit("ai_verification_resolved", { requestId });
      }

      res.json({ success: true, message: "Verification processed." });
    } catch (err: any) {
      console.error("[PWA Verification Error Handled]:", err);
      res.json({ success: true, message: "Handled gracefully." });
    }
  });

  // Reconnect WhatsApp
  app.post("/api/whatsapp/reconnect", requireAuth, async (req, res) => {
    try {
      await waClient.disconnect();
      res.json({ success: true, message: "Reconnecting & generating new QR code..." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Disconnect WhatsApp
  app.post("/api/whatsapp/disconnect", requireAuth, async (req, res) => {
    try {
      await waClient.disconnect();
      res.json({ success: true, message: "Disconnected." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return server;
}
