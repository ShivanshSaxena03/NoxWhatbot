import { EventEmitter } from "events";
import pino from "pino";
import fs from "fs";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  WASocket
} from "@whiskeysockets/baileys";
import { generateQrDataUrl } from "./qrHandler";
import { processIncomingWhatsAppMessage } from "./messageHandler";
import { addAuditLog } from "@jarvis/database";
import { AUDIT_EVENTS, WhatsAppConnectionState } from "@jarvis/shared";

export class WhatsAppClientManager extends EventEmitter {
  private socket: WASocket | null = null;
  private sessionDir: string = process.env.WA_SESSION_DIR || "./baileys_auth_info";
  private isInitializing: boolean = false;
  private currentState: WhatsAppConnectionState = {
    status: "INITIALIZING"
  };

  public getState(): WhatsAppConnectionState {
    return this.currentState;
  }

  public async initialize(): Promise<void> {
    if (this.isInitializing) return;
    this.isInitializing = true;

    console.log("[WhatsAppClient]: Initializing Baileys WhatsApp Connection...");
    
    if (!this.currentState.qrCode) {
      this.updateState({ status: "INITIALIZING" });
    }

    try {
      // Ensure session dir exists
      if (!fs.existsSync(this.sessionDir)) {
        fs.mkdirSync(this.sessionDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);

      let version: [number, number, number] = [2, 3000, 1015901307];
      try {
        const versionInfo = await Promise.race([
          fetchLatestBaileysVersion(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000))
        ]);
        version = versionInfo.version;
      } catch (e) {
        console.log("[WhatsAppClient]: Using default Baileys version for instant startup.");
      }

      console.log(`[WhatsAppClient]: Socket initializing with version ${version.join(".")}`);

      const logger = pino({ level: "silent" });

      // Clean up previous socket if exists
      if (this.socket) {
        try {
          this.socket.ev.removeAllListeners("connection.update");
          this.socket.ev.removeAllListeners("creds.update");
          this.socket.ev.removeAllListeners("messages.upsert");
          this.socket.end(undefined);
        } catch (e) {}
        this.socket = null;
      }

      this.socket = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: state,
        browser: ["Nox Assistant", "Chrome", "1.0.0"],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000
      });

      // Bind Credential Updates
      this.socket.ev.on("creds.update", saveCreds);

      // Connection Update Listener
      this.socket.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log("\n=================================================");
          console.log("   SCAN WHATSAPP QR CODE BELOW OR ON DASHBOARD   ");
          console.log("=================================================");
          try {
            const qrcodeTerminal = await import("qrcode-terminal");
            qrcodeTerminal.default.generate(qr, { small: true });
          } catch (e) {}

          console.log("[WhatsAppClient]: QR Code Generated! Emitting to Web Dashboard...");
          const qrDataUrl = await generateQrDataUrl(qr);
          this.updateState({
            status: "QR_REQUIRED",
            qrCode: qrDataUrl
          });
          this.emit("qr", qrDataUrl);
          this.emit("stateChange", this.currentState);
          await addAuditLog(AUDIT_EVENTS.WHATSAPP_QR_GENERATED, { timestamp: new Date() });
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;

          console.log(
            `[WhatsAppClient]: Connection closed (StatusCode: ${statusCode}). Reconnecting: ${!isLoggedOut}`
          );

          if (isLoggedOut) {
            this.updateState({ status: "DISCONNECTED", qrCode: null });
            try {
              if (fs.existsSync(this.sessionDir)) {
                fs.rmSync(this.sessionDir, { recursive: true, force: true });
              }
            } catch (e) {}
          }

          if (this.socket) {
            try {
              this.socket.ev.removeAllListeners("connection.update");
              this.socket.ev.removeAllListeners("creds.update");
              this.socket.ev.removeAllListeners("messages.upsert");
            } catch (e) {}
            this.socket = null;
          }

          this.isInitializing = false;
          setTimeout(() => {
            if (!this.isInitializing) {
              this.initialize().catch((err) => console.error("[WhatsAppClient Auto-Reconnect Error]:", err));
            }
          }, 1000);
        } else if (connection === "open") {
          console.log("[WhatsAppClient]: Baileys WhatsApp connection successfully opened!");
          const userJid = this.socket?.user?.id || "";
          const phone = userJid.split(":")[0];
          const pushName = this.socket?.user?.name || "Jarvis Owner";

          this.updateState({
            status: "CONNECTED",
            qrCode: null,
            phoneNumber: phone,
            pushName
          });
          this.emit("status", this.currentState);
          this.emit("stateChange", this.currentState);
          await addAuditLog(AUDIT_EVENTS.WHATSAPP_CONNECTED, { phone, pushName });
        }
      });

      // Incoming Message Listener
      this.socket.ev.on("messages.upsert", async (m) => {
        if (m.type !== "notify") return;

        for (const msg of m.messages) {
          if (!msg.message || msg.key.fromMe) continue;

          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            "";

          const isGroup = msg.key.remoteJid?.endsWith("@g.us") || false;
          const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

          await processIncomingWhatsAppMessage(
            {
              key: {
                remoteJid: msg.key.remoteJid || "",
                fromMe: msg.key.fromMe || false,
                id: msg.key.id || ""
              },
              pushName: msg.pushName || undefined,
              messageText: text,
              isGroup,
              mentionedJids
            },
            async (jid, replyText) => this.sendMessage(jid, replyText),
            (verificationPayload) => this.emit("verification_request", verificationPayload)
          );
        }
      });
    } catch (error) {
      console.error("[WhatsAppClient Init Error]:", error);
      this.updateState({ status: "DISCONNECTED", qrCode: null });
    } finally {
      this.isInitializing = false;
    }
  }

  public async sendMessage(jid: string, text: string): Promise<any> {
    if (!this.socket || this.currentState.status !== "CONNECTED") {
      throw new Error("WhatsApp client is not connected.");
    }
    return this.socket.sendMessage(jid, { text });
  }

  public async disconnect(): Promise<void> {
    console.log("[WhatsAppClient]: Disconnecting session and purging credentials for fresh QR code...");
    if (this.socket) {
      try {
        this.socket.ev.removeAllListeners("connection.update");
        this.socket.ev.removeAllListeners("creds.update");
        this.socket.ev.removeAllListeners("messages.upsert");
        await this.socket.logout().catch(() => {});
        this.socket.end(undefined);
      } catch (e) {}
      this.socket = null;
    }

    try {
      if (fs.existsSync(this.sessionDir)) {
        fs.rmSync(this.sessionDir, { recursive: true, force: true });
      }
    } catch (e) {}

    this.updateState({ status: "INITIALIZING", qrCode: null });
    this.emit("stateChange", this.currentState);
    this.isInitializing = false;

    // Launch a single clean socket initialization
    setTimeout(() => {
      this.initialize().catch((err) => console.error("[WhatsAppClient Re-init Error]:", err));
    }, 800);
  }

  private updateState(newState: Partial<WhatsAppConnectionState>) {
    this.currentState = { ...this.currentState, ...newState };
    this.emit("stateChange", this.currentState);
  }
}
