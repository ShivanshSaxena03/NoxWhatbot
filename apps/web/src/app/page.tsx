"use client";

import { useEffect, useState } from "react";
import { fetchApi, getSocket } from "@/lib/api";
import { ChatDTO } from "@jarvis/shared";
import SessionWindowSetting from "@/components/SessionWindowSetting";
import {
  MessageSquare,
  Bell,
  AlertTriangle,
  QrCode,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Trash2,
  Zap,
  Clock,
  Lock,
  AlertCircle
} from "lucide-react";

export default function DashboardPage() {
  const [waState, setWaState] = useState<any>({
    status: "INITIALIZING",
    qrCode: null,
    phoneNumber: null,
    pushName: null
  });

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatDTO[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [urgentLogs, setUrgentLogs] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const loadAllData = async () => {
    try {
      const [statusRes, chatsRes, remRes, logsRes] = await Promise.all([
        fetchApi<any>("/api/status").catch(() => null),
        fetchApi<any>("/api/chats").catch(() => null),
        fetchApi<any>("/api/reminders").catch(() => null),
        fetchApi<any>("/api/logs").catch(() => null)
      ]);

      if (statusRes?.whatsapp) {
        setWaState(statusRes.whatsapp);
        if (statusRes.whatsapp.qrCode) setQrCode(statusRes.whatsapp.qrCode);
      }
      if (chatsRes?.chats) setChats(chatsRes.chats);
      if (remRes?.reminders) setReminders(remRes.reminders);
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
    } catch (err) {
      console.error("Dashboard error:", err);
    }
  };

  useEffect(() => {
    loadAllData();

    const socket = getSocket();

    socket.on("whatsapp_state", (newState: any) => {
      setWaState(newState);
      if (newState.qrCode) setQrCode(newState.qrCode);
    });

    socket.on("whatsapp_qr", (newQr: string) => {
      setQrCode(newQr);
    });

    socket.on("important_message_received", (newMsg: any) => {
      // Exclude Jarvis outgoing messages from real-time urgent log state
      if (newMsg.senderName === "Jarvis" || newMsg.chatId === "jarvis_assistant") return;

      console.log("[Dashboard]: Real-time incoming important message received:", newMsg);
      setUrgentLogs((prev) => [
        {
          id: newMsg.requestId || `urg_${Date.now()}`,
          senderName: newMsg.senderName,
          senderJid: newMsg.chatId,
          content: newMsg.incomingMessage,
          createdAt: newMsg.timestamp || new Date().toISOString()
        },
        ...prev
      ]);
    });

    socket.on("chat_updated", () => loadAllData());
    socket.on("chat_deleted", () => loadAllData());

    const interval = setInterval(loadAllData, 3000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const handleReconnect = async () => {
    setActionLoading(true);
    setWaState({ status: "INITIALIZING", qrCode: null });
    setQrCode(null);
    try {
      await fetchApi("/api/whatsapp/reconnect", { method: "POST" });
      setTimeout(loadAllData, 1000);
    } catch (err) {
      alert("Reconnect failed: " + err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect WhatsApp and generate a new QR Code?")) return;
    setActionLoading(true);
    setWaState({ status: "INITIALIZING", qrCode: null });
    setQrCode(null);
    try {
      await fetchApi("/api/whatsapp/disconnect", { method: "POST" });
      setTimeout(loadAllData, 1000);
    } catch (err) {
      alert("Disconnect failed: " + err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteContact = async (chatId: string, name: string) => {
    if (!confirm(`Delete contact "${name}" completely from database?`)) return;
    try {
      await fetchApi(`/api/chats/${encodeURIComponent(chatId)}`, { method: "DELETE" });
      await loadAllData();
    } catch (err) {
      alert("Failed to delete contact: " + err);
    }
  };

  const pendingReminders = reminders.filter((r) => r.status === "PENDING");
  const isConnected = waState.status === "CONNECTED";

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-xs text-gray-500 mt-1">Personal AI Assistant Control Panel for Shivansh Saxena</p>
      </div>

      {/* WHATSAPP CONNECTION INTEGRATED SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Connection Status Box */}
        <div className="apple-card p-4 sm:p-6 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h2 className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-gray-700" /> WhatsApp Session
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                isConnected
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-gray-100 text-gray-600 border-gray-200"
              }`}>
                {waState.status}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Phone Number:</span>
                <span className="font-mono font-semibold text-gray-900 break-all">{waState.phoneNumber || "Not Paired"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Account Name:</span>
                <span className="font-medium text-gray-900 break-words">{waState.pushName || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50 items-center">
                <span className="text-gray-500">Pairing Status:</span>
                <span className="font-semibold text-gray-900">{isConnected ? "Active & Listening" : "Not Paired"}</span>
              </div>
              <div className="flex justify-between py-1 items-center pt-2">
                <SessionWindowSetting />
              </div>
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3 pt-2">
            <button
              onClick={handleReconnect}
              disabled={actionLoading}
              className="flex-1 apple-button py-2.5 text-xs flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} /> Reconnect
            </button>
            <button
              onClick={handleDisconnect}
              disabled={actionLoading || waState.status === "DISCONNECTED"}
              className="apple-button-secondary px-3 sm:px-4 py-2.5 text-xs flex items-center gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
            >
              <LogOut className="w-3.5 h-3.5" /> Disconnect
            </button>
          </div>
        </div>

        {/* QR Code Scanner Box */}
        <div className="apple-card p-4 sm:p-6 flex flex-col items-center justify-center text-center">
          {isConnected ? (
            <div className="py-6 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900">WhatsApp Paired & Ready</h3>
              <p className="text-xs text-gray-500 max-w-xs">Nox is active and auto-replying on your personal WhatsApp account.</p>
            </div>
          ) : qrCode ? (
            <div className="space-y-3">
              <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-gray-200 shadow-sm inline-block">
                <img src={qrCode} alt="WhatsApp QR Code" className="w-44 h-44 sm:w-52 sm:h-52 object-contain" />
              </div>
              <p className="text-xs text-gray-500 max-w-xs">Scan with WhatsApp &gt; Linked Devices &gt; Link a Device.</p>
            </div>
          ) : (
            <div className="py-10 space-y-2">
              <QrCode className="w-8 h-8 text-gray-300 animate-pulse mx-auto" />
              <p className="text-xs text-gray-400">Initializing Baileys QR code scanner...</p>
            </div>
          )}
        </div>
      </div>

      {/* CONDITIONAL METRICS & DATA (ONLY VISIBLE WHEN CONNECTED) */}
      {isConnected ? (
        <>
          {/* METRICS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="apple-card p-4 space-y-1">
              <div className="text-xs text-gray-500 font-medium flex justify-between">
                <span>Pending Reminders</span>
                <Bell className="w-4 h-4 text-gray-400" />
              </div>
              <div className="text-xl font-bold text-gray-900">{pendingReminders.length}</div>
            </div>

            <div className="apple-card p-4 space-y-1">
              <div className="text-xs text-gray-500 font-medium flex justify-between">
                <span>Interacted Contacts</span>
                <MessageSquare className="w-4 h-4 text-gray-400" />
              </div>
              <div className="text-xl font-bold text-gray-900">{chats.length}</div>
            </div>

            <div className="apple-card p-4 space-y-1">
              <div className="text-xs text-gray-500 font-medium flex justify-between">
                <span>Important Messages</span>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-xl font-bold text-red-600">{urgentLogs.length}</div>
            </div>
          </div>

          {/* DEDICATED IMPORTANT MESSAGES REAL-TIME SECTION */}
          <div className="apple-card p-4 sm:p-6 space-y-4 border-red-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" /> Important & Urgent WhatsApp Messages
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-500">Live feed of incoming messages sent with IMP: prefix. Auto-updates in real time.</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 flex-shrink-0">
                {urgentLogs.length} Important
              </span>
            </div>

            <div className="divide-y divide-gray-100 overflow-x-auto">
              {urgentLogs.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">
                  No important messages received yet. Messages sent with "IMP:" will be highlighted here in real time.
                </div>
              ) : (
                urgentLogs.map((log) => (
                  <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-gray-900 break-words">{log.senderName || "Contact"}</span>
                      </div>
                      <p className="text-xs text-gray-800 font-medium leading-relaxed break-words whitespace-pre-wrap">"{log.content}"</p>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap self-end sm:self-start">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* INTERACTED WHATSAPP CHATS */}
          <div className="apple-card p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-xs sm:text-sm font-semibold text-gray-900">Interacted WhatsApp Chats</h2>
                <p className="text-[11px] sm:text-xs text-gray-500">List of contacts that have messaged or interacted with your assistant.</p>
              </div>
            </div>

            <div className="divide-y divide-gray-100 overflow-x-auto">
              {chats.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  No chat interactions recorded yet. Incoming WhatsApp messages will appear here automatically.
                </div>
              ) : (
                chats.map((chat) => (
                  <div key={chat.id} className="py-3 flex items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-xs text-gray-800 flex-shrink-0">
                        {chat.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs text-gray-900 break-words">{chat.alias || chat.name}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <span className="px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium bg-gray-50 text-gray-600 border border-gray-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400 hidden xs:inline" />
                        <span>{ (chat as any).updatedAt ? new Date((chat as any).updatedAt).toLocaleDateString() : "Recently" }</span>
                      </span>

                      <button
                        onClick={() => handleDeleteContact(chat.id, chat.alias || chat.name)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                        title="Delete Contact Record"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        /* DISCONNECTED EMPTY STATE */
        <div className="apple-card p-8 sm:p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto text-gray-400">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900">WhatsApp Not Paired</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Scan the QR code above to link your WhatsApp account. Once connected, your contact interactions and message metrics will unlock and display here automatically.
          </p>
        </div>
      )}
    </div>
  );
}
