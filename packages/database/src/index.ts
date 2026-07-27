import { PrismaClient, PermissionMode, MsgDirection, ExecStatus, RemStatus } from "@prisma/client";
import { ChatPermissionMode, IntentCategory, ReminderStatus, MessageDirection, ExecutionStatus } from "@jarvis/shared";
import { encryptVaultText, decryptVaultText } from "@jarvis/security";

export const prisma = new PrismaClient();

export async function getMasterSetting(): Promise<boolean> {
  const setting = await prisma.systemSetting.findUnique({
    where: { id: "default" }
  });
  return setting ? setting.masterEnabled : true;
}

export async function setMasterSetting(masterEnabled: boolean) {
  return prisma.systemSetting.upsert({
    where: { id: "default" },
    update: { masterEnabled },
    create: { id: "default", masterEnabled }
  });
}

export async function getSessionWindowMinutes(): Promise<number> {
  const setting = await prisma.systemSetting.findUnique({
    where: { id: "default" }
  });
  return setting ? setting.sessionWindowMinutes : 2;
}

export async function setSessionWindowMinutes(sessionWindowMinutes: number) {
  return prisma.systemSetting.upsert({
    where: { id: "default" },
    update: { sessionWindowMinutes },
    create: { id: "default", sessionWindowMinutes }
  });
}

export async function markIntroSent(jid: string) {
  return prisma.chatPermission.update({
    where: { id: jid },
    data: { introSentAt: new Date() }
  });
}
export function mapModeToPrisma(mode: ChatPermissionMode): PermissionMode {
  switch (mode) {
    case ChatPermissionMode.READ_ONLY:
      return PermissionMode.READ_ONLY;
    case ChatPermissionMode.AI_ENABLED:
      return PermissionMode.AI_ENABLED;
    case ChatPermissionMode.DISABLED:
    default:
      return PermissionMode.DISABLED;
  }
}

export function mapModeFromPrisma(mode: PermissionMode): ChatPermissionMode {
  switch (mode) {
    case PermissionMode.READ_ONLY:
      return ChatPermissionMode.READ_ONLY;
    case PermissionMode.AI_ENABLED:
      return ChatPermissionMode.AI_ENABLED;
    case PermissionMode.DISABLED:
    default:
      return ChatPermissionMode.DISABLED;
  }
}

// ----------------------------------------------------
// CHAT AUTHORIZATION REPOSITORY
// ----------------------------------------------------

export async function getOrCreateChatPermission(jid: string, name: string, isGroup: boolean = false) {
  const existing = await prisma.chatPermission.findUnique({
    where: { id: jid }
  });

  if (existing) {
    return prisma.chatPermission.update({
      where: { id: existing.id },
      data: {
        lastActivity: new Date(),
        name: existing.name || name
      }
    });
  }

  // Deduplication: If a contact with matching name/alias already exists, link to that contact
  if (name && name !== jid && !isGroup) {
    const existingByName = await prisma.chatPermission.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: "insensitive" } },
          { alias: { equals: name, mode: "insensitive" } }
        ]
      }
    });

    if (existingByName) {
      return existingByName;
    }
  }

  // DEFAULT PERMISSION FOR EVERY NEW CHAT MUST BE DISABLED
  return prisma.chatPermission.create({
    data: {
      id: jid,
      name: name || jid,
      mode: PermissionMode.DISABLED,
      isGroup,
      unreadCount: 0
    }
  });
}

export async function deleteChatPermission(jid: string) {
  // Delete chat permission and all associated messages/reminders (cascade)
  return prisma.chatPermission.delete({
    where: { id: jid }
  });
}

export async function updateChatMode(jid: string, mode: ChatPermissionMode, alias?: string) {
  const prismaMode = mapModeToPrisma(mode);
  return prisma.chatPermission.update({
    where: { id: jid },
    data: {
      mode: prismaMode,
      ...(alias !== undefined ? { alias } : {})
    }
  });
}

export async function listAllChats() {
  const chats = await prisma.chatPermission.findMany({
    orderBy: { lastActivity: "desc" }
  });

  return chats.map(chat => ({
    id: chat.id,
    name: chat.alias || chat.name,
    alias: chat.alias,
    profilePic: chat.profilePic,
    mode: mapModeFromPrisma(chat.mode),
    lastActivity: chat.lastActivity,
    unreadCount: chat.unreadCount,
    isGroup: chat.isGroup
  }));
}

export async function markChatIntroSent(jid: string) {
  return prisma.chatPermission.update({
    where: { id: jid },
    data: { introSentAt: new Date() }
  });
}

// ----------------------------------------------------
// MESSAGE LOG REPOSITORY
// ----------------------------------------------------

export async function logMessage(params: {
  whatsappMsgId: string;
  chatId: string;
  senderJid: string;
  senderName: string;
  direction: MessageDirection;
  content: string;
  intentDetected?: string;
  priority?: "NORMAL" | "HIGH";
  executionStatus: ExecutionStatus;
}) {
  return prisma.messageLog.create({
    data: {
      whatsappMsgId: params.whatsappMsgId,
      chatId: params.chatId,
      senderJid: params.senderJid,
      senderName: params.senderName,
      direction: params.direction === MessageDirection.INCOMING ? MsgDirection.INCOMING : MsgDirection.OUTGOING,
      content: params.content,
      intentDetected: params.intentDetected || null,
      priority: params.priority || "NORMAL",
      executionStatus: params.executionStatus === ExecutionStatus.IGNORED ? ExecStatus.IGNORED :
                       params.executionStatus === ExecutionStatus.PROCESSED ? ExecStatus.PROCESSED :
                       params.executionStatus === ExecutionStatus.FAILED ? ExecStatus.FAILED : ExecStatus.STORED
    }
  });
}

export async function getChatMessages(chatId: string, limit = 50) {
  return prisma.messageLog.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    take: limit
  });
}

export async function deleteChatHistory(chatId: string) {
  return prisma.messageLog.deleteMany({
    where: { chatId }
  });
}

// ----------------------------------------------------
// REMINDERS REPOSITORY
// ----------------------------------------------------

export async function createReminder(params: {
  chatId: string;
  title: string;
  messageToSend: string;
  scheduledAt: Date;
  recurrence?: string;
  offsetMinutes?: number;
}) {
  return prisma.reminder.create({
    data: {
      chatId: params.chatId,
      title: params.title,
      messageToSend: params.messageToSend,
      scheduledAt: params.scheduledAt,
      recurrence: params.recurrence || null,
      offsetMinutes: params.offsetMinutes || 0,
      status: RemStatus.PENDING
    }
  });
}

export async function getDueReminders() {
  const now = new Date();
  return prisma.reminder.findMany({
    where: {
      status: RemStatus.PENDING,
      scheduledAt: { lte: now }
    },
    include: {
      chat: true
    }
  });
}

export async function updateReminderStatus(id: string, status: ReminderStatus) {
  const remStatus = status === ReminderStatus.COMPLETED ? RemStatus.COMPLETED :
                    status === ReminderStatus.TRIGGERED ? RemStatus.TRIGGERED :
                    status === ReminderStatus.CANCELLED ? RemStatus.CANCELLED : RemStatus.PENDING;

  return prisma.reminder.update({
    where: { id },
    data: { status: remStatus }
  });
}

export async function listReminders(chatId?: string) {
  return prisma.reminder.findMany({
    where: chatId ? { chatId } : {},
    orderBy: { scheduledAt: "asc" }
  });
}

// ----------------------------------------------------
// MEMORY SYSTEM REPOSITORY
// ----------------------------------------------------

export async function saveMemoryFact(key: string, value: string, category: string = "General", encrypted = false) {
  const storeValue = encrypted ? encryptVaultText(value) : value;
  return prisma.memoryFact.upsert({
    where: { key },
    update: { value: storeValue, category, encrypted, updatedAt: new Date() },
    create: { key, value: storeValue, category, encrypted }
  });
}

export async function searchMemoryFact(query: string) {
  const facts = await prisma.memoryFact.findMany({
    where: {
      OR: [
        { key: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
        { value: { contains: query, mode: "insensitive" } }
      ]
    }
  });

  return facts.map(fact => ({
    ...fact,
    value: fact.encrypted ? decryptVaultText(fact.value) : fact.value
  }));
}

export async function listAllMemoryFacts() {
  const facts = await prisma.memoryFact.findMany({
    orderBy: { updatedAt: "desc" }
  });

  return facts.map(fact => ({
    ...fact,
    value: fact.encrypted ? decryptVaultText(fact.value) : fact.value
  }));
}

// ----------------------------------------------------
// PASSWORD VAULT REPOSITORY
// ----------------------------------------------------

export async function saveVaultItem(params: {
  title: string;
  passwordText: string;
  username?: string;
  category?: string;
  notes?: string;
}) {
  const encryptedPassword = encryptVaultText(params.passwordText);
  return prisma.vaultItem.create({
    data: {
      title: params.title,
      username: params.username || null,
      encryptedPassword,
      category: params.category || "General",
      notes: params.notes || null
    }
  });
}

export async function listVaultItems(search?: string) {
  const items = await prisma.vaultItem.findMany({
    where: search ? {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } }
      ]
    } : {},
    orderBy: { title: "asc" }
  });

  return items.map(item => ({
    id: item.id,
    title: item.title,
    username: item.username,
    category: item.category,
    notes: item.notes,
    password: decryptVaultText(item.encryptedPassword),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  }));
}

export async function deleteVaultItem(id: string) {
  return prisma.vaultItem.delete({
    where: { id }
  });
}

// ----------------------------------------------------
// AUDIT LOG REPOSITORY
// ----------------------------------------------------

export async function addAuditLog(eventType: string, details: Record<string, any> | string) {
  const detailsStr = typeof details === "string" ? details : JSON.stringify(details);
  return prisma.auditLog.create({
    data: {
      eventType,
      details: detailsStr
    }
  });
}

export async function getRecentAuditLogs(limit = 100) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit
  });
}

export * from "@prisma/client";
