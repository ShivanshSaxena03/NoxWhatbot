import { io, Socket } from "socket.io-client";

// Dynamically resolve API base from the browser's host so it works from any
// device on the network (phone, tablet, etc.) without extra env config.
// Falls back to NEXT_PUBLIC_API_BASE env var if explicitly set.
function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_BASE) {
    return process.env.NEXT_PUBLIC_API_BASE;
  }
  if (typeof window !== "undefined") {
    // Use the same hostname the browser used to reach the dashboard,
    // but always point to the backend port (3001).
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3001`;
  }
  return "http://localhost:3001";
}

const API_BASE = getApiBase();

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
