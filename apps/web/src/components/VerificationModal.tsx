"use client";

import { useEffect, useState } from "react";
import { getSocket, fetchApi } from "@/lib/api";
import { ShieldCheck, CheckCircle2, Edit3, X, AlertTriangle, Send, PhoneCall, Bot } from "lucide-react";

export interface VerificationPayload {
  requestId: string;
  chatId: string;
  senderName: string;
  incomingMessage: string;
  generatedReply: string;
  isUrgent: boolean;
  type: "URGENT_UPDATE" | "WANTS_TO_TALK";
  timestamp: string;
}

export default function VerificationModal() {
  const [requests, setRequests] = useState<VerificationPayload[]>([]);
  const [currentRequest, setCurrentRequest] = useState<VerificationPayload | null>(null);
  const [customReplyText, setCustomReplyText] = useState<string>("");
  const [isEditingCustom, setIsEditingCustom] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const socket = getSocket();

    const onVerificationRequest = (payload: VerificationPayload) => {
      console.log("[PWA Modal]: New verification request received:", payload);
      setRequests((prev) => [...prev, payload]);

      if ("Notification" in window && Notification.permission === "granted") {
        const notifTitle = payload.type === "URGENT_UPDATE"
          ? `🔴 URGENT Message from ${payload.senderName}`
          : `💬 ${payload.senderName} wants to talk`;

        new Notification(notifTitle, {
          body: `"${payload.incomingMessage.substring(0, 60)}" - Tap to verify reply`,
          icon: "/icon.svg",
          requireInteraction: true
        });
      }
    };

    const onVerificationResolved = (data: { requestId: string }) => {
      setRequests((prev) => prev.filter((r) => r.requestId !== data.requestId));
    };

    socket.on("ai_verification_request", onVerificationRequest);
    socket.on("ai_verification_resolved", onVerificationResolved);

    // Cleanup: only remove these specific listeners — do NOT disconnect the shared socket
    return () => {
      socket.off("ai_verification_request", onVerificationRequest);
      socket.off("ai_verification_resolved", onVerificationResolved);
    };
  }, []);

  useEffect(() => {
    if (requests.length > 0 && !currentRequest) {
      setCurrentRequest(requests[0]);
      setCustomReplyText(requests[0].generatedReply);
      setIsEditingCustom(false);
    } else if (requests.length === 0) {
      setCurrentRequest(null);
    }
  }, [requests, currentRequest]);

  const handleAction = async (action: "approve" | "enable_ai" | "custom" | "dismiss") => {
    if (!currentRequest) return;
    setLoading(true);

    try {
      await fetchApi("/api/ai/verify", {
        method: "POST",
        body: JSON.stringify({
          requestId: currentRequest.requestId,
          chatId: currentRequest.chatId,
          action,
          customReply: action === "custom" ? customReplyText : undefined
        })
      });
    } catch (err) {
      console.warn("Verification payload sent with fallback:", err);
    } finally {
      setRequests((prev) => prev.filter((r) => r.requestId !== currentRequest.requestId));
      setCurrentRequest(null);
      setLoading(false);
    }
  };

  if (!currentRequest) return null;

  const isUrgent = currentRequest.type === "URGENT_UPDATE" || currentRequest.isUrgent;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="max-w-md w-full bg-white rounded-3xl border border-gray-200 p-6 shadow-2xl space-y-5 text-gray-900">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              isUrgent ? "bg-red-50 border-red-200 text-red-600" : "bg-gray-100 border-gray-200 text-gray-900"
            }`}>
              {isUrgent ? <AlertTriangle className="w-5 h-5" /> : <PhoneCall className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {isUrgent ? "🔴 Urgent Update Received" : `💬 ${currentRequest.senderName} Wants to Talk`}
              </h2>
              <p className="text-xs text-gray-500 font-medium">Verification for Shivansh Saxena</p>
            </div>
          </div>
          <button
            onClick={() => handleAction("dismiss")}
            className="p-1.5 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sender & Incoming Message Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Incoming Message</span>
            <span className="font-mono text-[10px]">
              {new Date(currentRequest.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
            <div className="text-xs font-semibold text-gray-900 flex items-center justify-between">
              <span>{currentRequest.senderName}</span>
              <span className="text-[10px] text-gray-400 font-mono">{currentRequest.chatId}</span>
            </div>
            <p className="text-xs text-gray-800 font-medium pt-1">"{currentRequest.incomingMessage}"</p>
          </div>
        </div>

        {/* Proposed AI Response Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-900 uppercase tracking-wider text-[10px]">Proposed AI Reply</span>
            <button
              onClick={() => setIsEditingCustom(!isEditingCustom)}
              className="text-xs text-gray-600 hover:text-gray-900 underline flex items-center gap-1 font-medium"
            >
              <Edit3 className="w-3.5 h-3.5" /> {isEditingCustom ? "Use AI Draft" : "Write Custom"}
            </button>
          </div>

          {isEditingCustom ? (
            <textarea
              value={customReplyText}
              onChange={(e) => setCustomReplyText(e.target.value)}
              placeholder="Write your custom reply..."
              className="w-full h-24 bg-white border border-gray-300 rounded-xl p-3 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          ) : (
            <div className="p-3.5 rounded-2xl bg-gray-100 border border-gray-200 text-xs text-gray-800 font-medium leading-relaxed">
              {currentRequest.generatedReply}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col gap-2">
          {isEditingCustom ? (
            <button
              onClick={() => handleAction("custom")}
              disabled={loading || !customReplyText.trim()}
              className="w-full py-2.5 rounded-xl apple-button text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> Send Custom Reply
            </button>
          ) : (
            <button
              onClick={() => handleAction("enable_ai")}
              disabled={loading}
              className="w-full py-3 rounded-xl apple-button text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Bot className="w-4 h-4" /> Approve AI to Talk & Reply
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setIsEditingCustom(true)}
              disabled={loading}
              className="flex-1 py-2 rounded-xl apple-button-secondary text-xs font-medium"
            >
              Edit Reply
            </button>
            <button
              onClick={() => handleAction("dismiss")}
              disabled={loading}
              className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-medium"
            >
              Keep Offline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
