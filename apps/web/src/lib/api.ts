import { io, Socket } from "socket.io-client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  const token = typeof window !== "undefined" ? localStorage.getItem("jarvis_auth_token") : null;

  if (!socketInstance) {
    socketInstance = io(API_BASE, {
      transports: ["websocket", "polling"],
      autoConnect: false, // DO NOT CONNECT AUTOMATICALLY BEFORE LOGIN
      auth: {
        token: token || ""
      }
    });
  }

  if (token && token === "authenticated_jarvis_session") {
    socketInstance.auth = { token };
    if (!socketInstance.connected) {
      socketInstance.connect(); // CONNECT ONLY AFTER VALID LOGIN
    }
  }

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("jarvis_auth_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...(options?.headers as Record<string, string>)
    }
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "API Request Failed");
  }
  return data as T;
}
