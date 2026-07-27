"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/api";
import { Bell, CheckCircle2 } from "lucide-react";

export default function NotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    // 1. Register Service Worker for PWA
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("[PWA Service Worker] Registered:", reg.scope))
        .catch((err) => console.error("[PWA Service Worker] Registration failed:", err));
    }

    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    const socket = getSocket();

    socket.on("whatsapp_state", (state: any) => {
      if (state && state.status === "CONNECTED" && Notification.permission === "granted") {
        new Notification("Nox WhatsApp Online", {
          body: `Connected as ${state.pushName || state.phoneNumber || "WhatsApp"}`,
          icon: "/icon.svg"
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }

    const res = await (Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission());

    setPermission(res);

    if (res === "granted") {
      new Notification("PWA Alerts Enabled", {
        body: "You will receive high-priority WhatsApp notifications.",
        icon: "/icon.svg"
      });
    }
  };

  if (permission === "granted") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium p-1.5 sm:px-2.5 sm:py-1 rounded-full bg-gray-100 border border-gray-200" title="Alerts Active">
        <CheckCircle2 className="w-3.5 h-3.5 text-gray-900" />
        <span className="hidden sm:inline">Alerts Active</span>
      </div>
    );
  }

  return (
    <button
      onClick={requestPermission}
      className="flex items-center gap-1.5 text-xs text-gray-700 font-medium p-1.5 sm:px-3 sm:py-1 rounded-full bg-gray-100 border border-gray-200 hover:bg-gray-200 transition"
      title="Enable Desktop/Mobile Alerts"
    >
      <Bell className="w-3.5 h-3.5 text-gray-700" />
      <span className="hidden sm:inline">Enable Alerts</span>
    </button>
  );
}
