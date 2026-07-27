"use client";

import { useEffect, useState } from "react";
import { fetchApi, getSocket } from "@/lib/api";
import { Clock } from "lucide-react";

const WINDOW_OPTIONS = [
  { label: "1 min", value: 1 },
  { label: "2 mins", value: 2 },
  { label: "5 mins", value: 5 },
  { label: "15 mins", value: 15 },
  { label: "30 mins", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "24 hours", value: 1440 }
];

export default function SessionWindowSetting() {
  const [minutes, setMinutes] = useState<number>(2);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchApi<{ success: boolean; minutes: number }>("/api/settings/session-window")
      .then((res) => {
        if (res.minutes) setMinutes(res.minutes);
      })
      .catch(() => {});

    const socket = getSocket();
    socket.on("session_window_updated", (data: any) => {
      if (data && typeof data.minutes === "number") {
        setMinutes(data.minutes);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleChange = async (newMinutes: number) => {
    setLoading(true);
    try {
      await fetchApi("/api/settings/session-window", {
        method: "POST",
        body: JSON.stringify({ minutes: newMinutes })
      });
      setMinutes(newMinutes);
    } catch (err) {
      alert("Failed to update reset timeout: " + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1.5 text-gray-500 font-medium">
        <Clock className="w-3.5 h-3.5 text-gray-400" />
        <span className="hidden sm:inline">Intro Reset Timeout:</span>
        <span className="sm:hidden">Reset:</span>
      </div>
      <select
        value={minutes}
        onChange={(e) => handleChange(Number(e.target.value))}
        disabled={loading}
        className="bg-gray-50 border border-gray-200 text-gray-900 font-semibold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-900 cursor-pointer"
      >
        {WINDOW_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
