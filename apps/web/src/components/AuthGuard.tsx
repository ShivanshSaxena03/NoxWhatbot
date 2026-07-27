"use client";

import { useState, useEffect } from "react";
import { getSocket, disconnectSocket } from "@/lib/api";
import { LogIn, ShieldAlert } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("jarvis_auth_token");
    if (token === "authenticated_jarvis_session") {
      setIsAuthenticated(true);
      getSocket().connect(); // Establish connection ONLY after verifying login token
    } else {
      setIsAuthenticated(false);
      disconnectSocket(); // Disconnect socket if not authenticated
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data: { success: boolean; token?: string; error?: string } = await res.json();

      if (data.success && data.token) {
        localStorage.setItem("jarvis_auth_token", data.token);
        setIsAuthenticated(true);
        getSocket().connect(); // Establish connection ONLY after successful login!
      } else {
        setError(data.error || "Invalid credentials.");
      }
    } catch (err: any) {
      setError("Failed to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  // Loading state during initial token check
  if (isAuthenticated === null) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Centered Login Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="w-full max-w-sm space-y-6 mx-auto my-auto text-center">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-bold text-xl mx-auto shadow-sm">
              N
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Nox Assistant</h1>
            <p className="text-xs text-gray-500">Sign in to access Shivansh Saxena's AI Control Panel</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="apple-card p-6 space-y-4 shadow-sm border border-gray-200 text-left">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 transition"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="apple-button w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Sign In
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[11px] text-gray-400">
            Protected by Nox Auth Security & Vault Key
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
