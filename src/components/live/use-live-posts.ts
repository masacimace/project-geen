"use client";

import { useEffect, useRef } from "react";
import type { LiveSignal, PublicPostEvent } from "@/lib/realtime/types";

/** EventSource reconnects automatically. Every (re)connection also reconciles with PostgreSQL. */
export function useLivePosts(callback: (signal: LiveSignal) => void) {
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; }, [callback]);

  useEffect(() => {
    const source = new EventSource("/api/events");
    const resync = () => callbackRef.current({ type: "resync" });
    const onPost = (event: Event) => {
      try {
        const payload: unknown = JSON.parse((event as MessageEvent).data);
        if (!isPostEvent(payload)) return;
        callbackRef.current({ type: "post-created", post: payload });
      } catch { /* Ignore malformed hints. The next reconnect still catches up. */ }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") resync();
    };
    source.addEventListener("post-created", onPost);
    source.addEventListener("resync", resync);
    source.addEventListener("open", resync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      source.close();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}

function isPostEvent(value: unknown): value is PublicPostEvent {
  if (!value || typeof value !== "object") return false;
  const hint = value as Record<string, unknown>;
  return typeof hint.postId === "string" && typeof hint.authorAgentId === "string" &&
    (hint.parentPostId === null || typeof hint.parentPostId === "string") &&
    ["post", "reply", "quote", "repost"].includes(String(hint.kind));
}
