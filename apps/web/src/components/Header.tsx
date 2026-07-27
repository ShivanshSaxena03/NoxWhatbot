"use client";

import { useState, useEffect } from "react";
import { getSocket } from "@/lib/api";
import NotificationManager from "./NotificationManager";
import MasterToggle from "./MasterToggle";
import { Download, RefreshCw, LogOut } from "lucide-react";

export default function Header() {
  const [status, setStatus] = useState<string>("INITIALIZING");
  const [phone, setPhone] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    const socket = getSocket();

    socket.on("whatsapp_state", (state: any) => {
      if (state) {
        setStatus(state.status);
        if (state.phoneNumber) setPhone(state.phoneNumber);
      }
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      socket.disconnect();
    };
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) {
      alert("To install Nox PWA: Tap your browser menu (⋮ or Share) and select 'Add to Home Screen' / 'Install App'.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("jarvis_auth_token");
    window.location.reload();
  };

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-gray-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-bold text-gray-900 tracking-tight truncate max-w-[100px] xs:max-w-none">
          Nox
        </h2>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* PWA Install App Button */}
        {!isInstalled && (
          <button
            onClick={handleInstallPwa}
            className="p-1.5 sm:px-3 sm:py-1 rounded-full text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800 transition shadow-sm flex items-center gap-1.5"
            title="Install Nox PWA"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Install App</span>
          </button>
        )}

        {/* Master AI ON/OFF Toggle */}
        <MasterToggle />

        {/* Alerts / Notification Manager */}
        <NotificationManager />

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="p-1.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 transition flex items-center gap-1"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
