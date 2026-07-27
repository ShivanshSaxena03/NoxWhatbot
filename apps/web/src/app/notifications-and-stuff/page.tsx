"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import {
  Bell,
  AlertTriangle,
  Plus
} from "lucide-react";

export default function NotificationsAndStuffPage() {
  const [activeTab, setActiveTab] = useState<"urgent" | "reminders">("urgent");

  // Data states
  const [urgentLogs, setUrgentLogs] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);

  // Reminder form state
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [remTitle, setRemTitle] = useState("");
  const [remTime, setRemTime] = useState("");
  const [remChatId, setRemChatId] = useState("");

  const loadData = async () => {
    try {
      const [logsRes, remRes] = await Promise.all([
        fetchApi<any>("/api/logs").catch(() => null),
        fetchApi<any>("/api/reminders").catch(() => null)
      ]);

      if (logsRes?.logs) {
        // FILTER: Only show incoming HIGH priority messages from contacts (Exclude Jarvis auto-replies)
        const incomingUrgent = logsRes.logs.filter((l: any) =>
          l.priority === "HIGH" &&
          l.direction !== "OUTGOING" &&
          l.senderName !== "Jarvis" &&
          l.senderJid !== "jarvis_assistant"
        );
        setUrgentLogs(incomingUrgent);
      }
      if (remRes?.reminders) setReminders(remRes.reminders);
    } catch (err) {
      console.error("Failed loading data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remTitle || !remTime) return;
    try {
      await fetchApi("/api/reminders", {
        method: "POST",
        body: JSON.stringify({ title: remTitle, scheduledAt: new Date(remTime).toISOString(), chatId: remChatId || "me" })
      });
      setRemTitle("");
      setRemTime("");
      setShowReminderForm(false);
      loadData();
    } catch (err) {
      alert("Failed to create reminder: " + err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Urgent Notifications & Reminders</h1>
        <p className="text-xs text-gray-500 mt-1">View important WhatsApp messages and scheduled reminders.</p>
      </div>

      {/* Responsive Tabs Bar */}
      <div className="flex border-b border-gray-200 space-x-4 sm:space-x-6 text-xs font-medium text-gray-500 overflow-x-auto whitespace-nowrap scrollbar-none pb-0.5">
        <button
          onClick={() => setActiveTab("urgent")}
          className={`pb-3 flex items-center gap-1.5 transition ${
            activeTab === "urgent" ? "border-b-2 border-gray-900 text-gray-900 font-semibold" : "hover:text-gray-900"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          <span>Important Messages ({urgentLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("reminders")}
          className={`pb-3 flex items-center gap-1.5 transition ${
            activeTab === "reminders" ? "border-b-2 border-gray-900 text-gray-900 font-semibold" : "hover:text-gray-900"
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Reminders ({reminders.length})</span>
        </button>
      </div>

      {/* TAB 1: IMPORTANT MESSAGES */}
      {activeTab === "urgent" && (
        <div className="apple-card p-4 sm:p-6 space-y-4">
          <h2 className="text-xs sm:text-sm font-semibold text-gray-900">Important & Urgent WhatsApp Messages</h2>
          {urgentLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              No important messages logged. Messages starting with IMP: or Urgent: will be recorded here.
            </div>
          ) : (
            <div className="space-y-3">
              {urgentLogs.map((log) => (
                <div key={log.id} className="p-3.5 sm:p-4 rounded-xl border border-red-200 bg-red-50/50 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-900">{log.senderName || "Contact"}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-800 font-medium pt-1 leading-relaxed">"{log.content}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REMINDERS */}
      {activeTab === "reminders" && (
        <div className="apple-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-semibold text-gray-900">Scheduled Reminders</h2>
            <button
              onClick={() => setShowReminderForm(!showReminderForm)}
              className="apple-button px-3 py-1.5 text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Reminder
            </button>
          </div>

          {showReminderForm && (
            <form onSubmit={handleAddReminder} className="p-3.5 sm:p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
              <input
                type="text"
                placeholder="Reminder title (e.g. Call Client)"
                value={remTitle}
                onChange={(e) => setRemTitle(e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg"
                required
              />
              <input
                type="datetime-local"
                value={remTime}
                onChange={(e) => setRemTime(e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg"
                required
              />
              <button type="submit" className="apple-button w-full py-2.5 text-xs">
                Save Reminder
              </button>
            </form>
          )}

          {reminders.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">No scheduled reminders.</div>
          ) : (
            <div className="space-y-2">
              {reminders.map((rem) => (
                <div key={rem.id} className="p-3.5 border border-gray-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-gray-900">{rem.title}</div>
                    <div className="text-[11px] text-gray-500">{new Date(rem.scheduledAt).toLocaleString()}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
                    {rem.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
