import { getDueReminders, updateReminderStatus, createReminder, addAuditLog } from "@jarvis/database";
import { ReminderStatus, AUDIT_EVENTS } from "@jarvis/shared";
import { calculateNextRecurrenceDate } from "./parser";

export type ReminderTriggerCallback = (reminder: {
  id: string;
  chatId: string;
  title: string;
  messageToSend: string;
}) => Promise<void>;

export class ReminderScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private triggerCallback: ReminderTriggerCallback | null = null;
  private pollIntervalMs: number = 10000; // Poll DB every 10 seconds

  constructor(pollIntervalMs: number = 10000) {
    this.pollIntervalMs = pollIntervalMs;
  }

  public registerTriggerCallback(callback: ReminderTriggerCallback) {
    this.triggerCallback = callback;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[ReminderScheduler]: Started with ${this.pollIntervalMs}ms interval.`);

    this.timer = setInterval(async () => {
      await this.checkAndFireReminders();
    }, this.pollIntervalMs);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log("[ReminderScheduler]: Stopped.");
  }

  public async checkAndFireReminders() {
    try {
      const dueReminders = await getDueReminders();
      if (dueReminders.length === 0) return;

      console.log(`[ReminderScheduler]: Found ${dueReminders.length} due reminder(s). Processing...`);

      for (const rem of dueReminders) {
        try {
          // Check if chat is still valid
          if (!rem.chatId) continue;

          console.log(`[ReminderScheduler]: Firing reminder "${rem.title}" for Chat ${rem.chatId}`);

          // Trigger outgoing WhatsApp notification via registered callback
          if (this.triggerCallback) {
            await this.triggerCallback({
              id: rem.id,
              chatId: rem.chatId,
              title: rem.title,
              messageToSend: rem.messageToSend
            });
          }

          // Mark current instance completed
          await updateReminderStatus(rem.id, ReminderStatus.COMPLETED);

          await addAuditLog(AUDIT_EVENTS.REMINDER_EXECUTED, {
            reminderId: rem.id,
            chatId: rem.chatId,
            title: rem.title
          });

          // Handle Recurrence if set
          if (rem.recurrence && rem.recurrence !== "ONCE") {
            const nextScheduled = calculateNextRecurrenceDate(new Date(rem.scheduledAt), rem.recurrence);
            if (nextScheduled) {
              await createReminder({
                chatId: rem.chatId,
                title: rem.title,
                messageToSend: rem.messageToSend,
                scheduledAt: nextScheduled,
                recurrence: rem.recurrence,
                offsetMinutes: rem.offsetMinutes
              });
              console.log(`[ReminderScheduler]: Next recurring reminder scheduled for ${nextScheduled.toISOString()}`);
            }
          }
        } catch (err: any) {
          console.error(`[ReminderScheduler]: Failed to process reminder ${rem.id}:`, err);
          await addAuditLog(AUDIT_EVENTS.REMINDER_FAILED, {
            reminderId: rem.id,
            error: err?.message || String(err)
          });
        }
      }
    } catch (error) {
      console.error("[ReminderScheduler Check Error]:", error);
    }
  }
}
