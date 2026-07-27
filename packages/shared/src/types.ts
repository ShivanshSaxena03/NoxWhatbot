export enum ChatPermissionMode {
  DISABLED = "DISABLED",
  READ_ONLY = "READ_ONLY",
  AI_ENABLED = "AI_ENABLED"
}

export enum IntentCategory {
  REMINDER = "REMINDER",
  MEMORY_STORE = "MEMORY_STORE",
  MEMORY_QUERY = "MEMORY_QUERY",
  VAULT_STORE = "VAULT_STORE",
  VAULT_QUERY = "VAULT_QUERY",
  TASK_CREATE = "TASK_CREATE",
  GENERAL_CHAT = "GENERAL_CHAT"
}

export enum ReminderStatus {
  PENDING = "PENDING",
  TRIGGERED = "TRIGGERED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}

export enum MessageDirection {
  INCOMING = "INCOMING",
  OUTGOING = "OUTGOING"
}

export enum ExecutionStatus {
  IGNORED = "IGNORED",
  STORED = "STORED",
  PROCESSED = "PROCESSED",
  FAILED = "FAILED"
}

export interface ChatDTO {
  id: string; // JID
  name: string;
  alias?: string | null;
  profilePic?: string | null;
  mode: ChatPermissionMode;
  lastActivity: Date | string;
  unreadCount: number;
  isGroup: boolean;
  updatedAt?: Date | string;
}

export interface MessageDTO {
  id: string;
  whatsappMsgId: string;
  chatId: string;
  senderJid: string;
  senderName: string;
  direction: MessageDirection;
  content: string;
  intentDetected?: string | null;
  executionStatus: ExecutionStatus;
  createdAt: Date | string;
}

export interface ReminderDTO {
  id: string;
  chatId: string;
  title: string;
  messageToSend: string;
  scheduledAt: Date | string;
  recurrence?: string | null; // ONCE, DAILY, WEEKLY, MONTHLY, YEARLY, or cron
  offsetMinutes: number;
  status: ReminderStatus;
  createdAt: Date | string;
}

export interface MemoryFactDTO {
  id: string;
  key: string;
  category: string;
  value: string;
  encrypted: boolean;
  createdAt: Date | string;
}

export interface VaultItemDTO {
  id: string;
  title: string;
  username?: string | null;
  category?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AuditLogDTO {
  id: string;
  eventType: string;
  details: string;
  createdAt: Date | string;
}

export interface WhatsAppConnectionState {
  status: "INITIALIZING" | "QR_REQUIRED" | "CONNECTED" | "DISCONNECTED" | "RECONNECTING";
  qrCode?: string | null;
  phoneNumber?: string | null;
  pushName?: string | null;
  batteryLevel?: number | null;
  lastSeen?: Date | string | null;
}
