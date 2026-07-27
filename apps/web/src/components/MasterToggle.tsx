"use client";

import { useEffect, useState } from "react";
import { fetchApi, getSocket } from "@/lib/api";
import { Power } from "lucide-react";

export default function MasterToggle() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchApi<{ success: boolean; masterEnabled: boolean }>("/api/settings/master")
      .then((res) => setEnabled(res.masterEnabled))
      .catch(() => {});

    const socket = getSocket();
    socket.on("master_setting_updated", (data: any) => {
      if (data && typeof data.masterEnabled === "boolean") {
        setEnabled(data.masterEnabled);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    const newState = !enabled;
    try {
      await fetchApi("/api/settings/master", {
        method: "POST",
        body: JSON.stringify({ enabled: newState })
      });
      setEnabled(newState);
    } catch (err) {
      alert("Failed to toggle master setting: " + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1 rounded-full text-xs font-medium border transition ${
        enabled
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
          : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
      }`}
      title={enabled ? "AI Assistant Master Switch is ON" : "AI Assistant Master Switch is OFF"}
    >
      <Power className={`w-3.5 h-3.5 ${enabled ? "text-emerald-600" : "text-gray-400"}`} />
      <span className="hidden sm:inline">{enabled ? "AI Active" : "AI Dormant"}</span>
      <span className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-emerald-500" : "bg-gray-400"}`}></span>
    </button>
  );
}
