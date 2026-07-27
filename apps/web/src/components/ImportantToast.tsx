"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/api";
import { AlertCircle, X } from "lucide-react";

export interface ImportantMessageToastPayload {
  requestId: string;
  chatId: string;
  senderName: string;
  incomingMessage: string;
  timestamp: string;
}

export default function ImportantToast() {
  const [toasts, setToasts] = useState<ImportantMessageToastPayload[]>([]);

  useEffect(() => {
    const socket = getSocket();

    socket.on("important_message_received", (payload: ImportantMessageToastPayload) => {
      console.log("[Toast Notification]: New important message received:", payload);
      
      setToasts((prev) => [payload, ...prev]);

      // Native browser PWA push notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`IMP Message from ${payload.senderName}`, {
          body: `"${payload.incomingMessage}" sent as IMP by ${payload.senderName}`,
          icon: "/icon.svg",
          requireInteraction: false
        });
      }

      // Auto dismiss toast after 7 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.requestId !== payload.requestId));
      }, 7000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.requestId !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.requestId}
          className="pointer-events-auto bg-white border border-gray-200 shadow-xl rounded-2xl p-4 flex items-start justify-between gap-3 animate-in slide-in-from-top-4 duration-200"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-gray-900">
                "{toast.incomingMessage}"
              </div>
              <p className="text-[11px] text-gray-600 font-medium">
                sent as IMP by <span className="font-semibold text-gray-900">{toast.senderName}</span>
              </p>
              <span className="text-[10px] text-gray-400 font-mono">
                {new Date(toast.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
          <button
            onClick={() => dismissToast(toast.requestId)}
            className="text-gray-400 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
