/**
 * Robust Natural Language Time & Recurrence Parser for Jarvis
 */

export interface ParsedTimeResult {
  scheduledAt: Date;
  recurrence?: string;
  displayTime: string;
}

export function parseNaturalTimeExpression(expression: string, baseDate: Date = new Date()): ParsedTimeResult {
  const text = expression.trim().toLowerCase();
  let targetDate = new Date(baseDate.getTime());
  let recurrence: string | undefined = undefined;

  // 1. Check "in X minutes / mins"
  const inMinsMatch = text.match(/in\s+(\d+)\s*(m|min|mins|minute|minutes)/i);
  if (inMinsMatch) {
    const mins = parseInt(inMinsMatch[1], 10);
    targetDate = new Date(baseDate.getTime() + mins * 60 * 1000);
    return {
      scheduledAt: targetDate,
      displayTime: `${mins} minute${mins > 1 ? "s" : ""}`,
      recurrence: "ONCE"
    };
  }

  // 2. Check "in X hours / hrs"
  const inHoursMatch = text.match(/in\s+(\d+)\s*(h|hr|hrs|hour|hours)/i);
  if (inHoursMatch) {
    const hours = parseInt(inHoursMatch[1], 10);
    targetDate = new Date(baseDate.getTime() + hours * 60 * 60 * 1000);
    return {
      scheduledAt: targetDate,
      displayTime: `${hours} hour${hours > 1 ? "s" : ""}`,
      recurrence: "ONCE"
    };
  }

  // 3. Check "in X seconds / secs"
  const inSecsMatch = text.match(/in\s+(\d+)\s*(s|sec|secs|second|seconds)/i);
  if (inSecsMatch) {
    const secs = parseInt(inSecsMatch[1], 10);
    targetDate = new Date(baseDate.getTime() + secs * 1000);
    return {
      scheduledAt: targetDate,
      displayTime: `${secs} second${secs > 1 ? "s" : ""}`,
      recurrence: "ONCE"
    };
  }

  // 4. Check "tomorrow" optional time "tomorrow at 4 pm" or "tomorrow 14:00"
  if (text.includes("tomorrow")) {
    targetDate.setDate(targetDate.getDate() + 1);

    const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3]?.toLowerCase();

      if (ampm === "pm" && hours < 12) hours += 12;
      if (ampm === "am" && hours === 12) hours = 0;

      targetDate.setHours(hours, minutes, 0, 0);
    } else {
      // Default to 9 AM tomorrow if no specific time given
      targetDate.setHours(9, 0, 0, 0);
    }

    return {
      scheduledAt: targetDate,
      displayTime: targetDate.toLocaleString(),
      recurrence: "ONCE"
    };
  }

  // 5. Check "every day at 8 AM" or "daily"
  if (text.includes("every day") || text.includes("daily")) {
    recurrence = "DAILY";
    const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3]?.toLowerCase();

      if (ampm === "pm" && hours < 12) hours += 12;
      if (ampm === "am" && hours === 12) hours = 0;

      targetDate.setHours(hours, minutes, 0, 0);
      if (targetDate <= baseDate) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
    }

    return {
      scheduledAt: targetDate,
      displayTime: `Every day at ${targetDate.toLocaleTimeString()}`,
      recurrence: "DAILY"
    };
  }

  // Default fallback: 10 minutes from now if unparseable
  targetDate = new Date(baseDate.getTime() + 10 * 60 * 1000);
  return {
    scheduledAt: targetDate,
    displayTime: "10 minutes",
    recurrence: "ONCE"
  };
}

export function calculateNextRecurrenceDate(currentDate: Date, recurrence: string): Date | null {
  const next = new Date(currentDate.getTime());

  switch (recurrence.toUpperCase()) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      return next;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      return next;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      return next;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      return next;
    default:
      return null;
  }
}
