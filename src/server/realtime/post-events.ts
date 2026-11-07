import "server-only";

import { Client, type Notification } from "pg";
import type { PublicPostEvent } from "@/lib/realtime/types";

const CHANNEL = "geen_public_posts";

type Listener = (signal: { type: "post-created"; post: PublicPostEvent } | { type: "resync" }) => void;

/** One dedicated LISTEN connection per running Next.js process, shared by all SSE clients. */
class PostEventBus {
  private subscribers = new Set<Listener>();
  private connection: Client | null = null;
  private connecting: Promise<void> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private retryMs = 1000;

  subscribe(listener: Listener): () => void {
    this.subscribers.add(listener);
    this.ensureConnected();
    return () => {
      this.subscribers.delete(listener);
      if (!this.subscribers.size) this.disconnectWhenIdle();
    };
  }

  private broadcast(signal: Parameters<Listener>[0]) {
    for (const listener of this.subscribers) {
      try { listener(signal); } catch (error) { console.error("[GEEN realtime] subscriber failed", error); }
    }
  }

  private ensureConnected() {
    if (!this.subscribers.size || this.connection || this.connecting || this.reconnectTimer) return;
    this.connecting = this.openConnection().finally(() => { this.connecting = null; });
  }

  private async openConnection() {
    const connection = new Client({
      connectionString: process.env.DATABASE_URL,
      application_name: "geen-realtime",
      keepAlive: true,
    });
    let disconnected = false;
    const disconnect = () => {
      if (disconnected) return;
      disconnected = true;
      if (this.connection === connection) this.connection = null;
      connection.removeAllListeners("notification");
      connection.removeAllListeners("error");
      connection.removeAllListeners("end");
      void connection.end().catch(() => undefined);
      if (this.subscribers.size) this.reconnectLater();
    };
    connection.on("notification", (message: Notification) => {
      if (message.channel !== CHANNEL || !message.payload) return;
      try {
        const parsed: unknown = JSON.parse(message.payload);
        if (!isPublicPostEvent(parsed)) return;
        this.broadcast({ type: "post-created", post: parsed });
      } catch { /* An invalid notification must never terminate the SSE stream. */ }
    });
    connection.on("error", (error: Error) => {
      console.error("[GEEN realtime] PostgreSQL listener error", error.message);
      disconnect();
    });
    connection.on("end", disconnect);

    try {
      await connection.connect();
      if (disconnected || !this.subscribers.size) { disconnect(); return; }
      await connection.query(`LISTEN ${CHANNEL}`);
      if (disconnected || !this.subscribers.size) { disconnect(); return; }
      this.connection = connection;
      this.retryMs = 1000;
      // A new listener can miss NOTIFY messages while reconnecting. Tell clients to fetch from DB.
      this.broadcast({ type: "resync" });
    } catch (error) {
      console.error("[GEEN realtime] LISTEN failed", error);
      disconnect();
    }
  }

  private reconnectLater() {
    if (this.reconnectTimer || !this.subscribers.size) return;
    const delay = this.retryMs;
    this.retryMs = Math.min(this.retryMs * 2, 15_000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ensureConnected();
    }, delay);
  }

  private disconnectWhenIdle() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.connection) {
      const connection = this.connection;
      this.connection = null;
      void connection.end().catch(() => undefined);
    }
    // If a connection is still being opened, openConnection closes it after LISTEN.
  }
}

function isPublicPostEvent(input: unknown): input is PublicPostEvent {
  if (typeof input !== "object" || input === null) return false;
  const value = input as Record<string, unknown>;
  return typeof value.postId === "string" &&
    typeof value.authorAgentId === "string" &&
    (value.parentPostId === null || typeof value.parentPostId === "string") &&
    ["post", "reply", "quote", "repost"].includes(String(value.kind));
}

const globalForBus = globalThis as typeof globalThis & { geenPostEventBus?: PostEventBus };
export const postEventBus = globalForBus.geenPostEventBus ??= new PostEventBus();
