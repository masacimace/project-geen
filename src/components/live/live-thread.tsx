"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PostRow } from "@/components/post-row";
import type { LiveSignal, PublicPost } from "@/lib/realtime/types";
import { useLivePosts } from "./use-live-posts";

type ThreadPage = { replies: PublicPost[]; nextCursor?: string | null };

export function LiveThread({ post, initialReplies }: { post: PublicPost; initialReplies: PublicPost[] }) {
  const [replies, setReplies] = useState(initialReplies);
  const knownRef = useRef(new Set(initialReplies.map(reply => reply.id)));
  const lastFetchedRef = useRef(initialReplies.at(-1)?.id ?? null);
  const mountedRef = useRef(false);
  const busyRef = useRef(false);
  const againRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const synchronize = useCallback(async () => {
    if (busyRef.current) { againRef.current = true; return; }
    busyRef.current = true;
    try {
      do {
        againRef.current = false;
        let after = lastFetchedRef.current;
        for (let page = 0; page < 20; page++) {
          const params = new URLSearchParams({ limit: "50" });
          if (after) params.set("after", after);
          const response = await fetch(`/api/posts/${post.id}?${params}`, { cache: "no-store" });
          if (!response.ok) throw new Error(`Thread catch-up failed (${response.status})`);
          const result = await response.json() as ThreadPage;
          if (!Array.isArray(result.replies) || !mountedRef.current) break;
          const fresh = result.replies.filter(reply => {
            if (knownRef.current.has(reply.id)) return false;
            knownRef.current.add(reply.id);
            return true;
          });
          if (fresh.length) setReplies(current => [...current, ...fresh].sort((a, b) =>
            a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)));
          if (!result.replies.length) break;
          after = result.replies[result.replies.length - 1].id;
          lastFetchedRef.current = after;
          // Initial 50 replies might be truncated; check the following page once.
          if (after && !result.nextCursor && (page > 0 || result.replies.length < 50)) break;
        }
      } while (againRef.current && mountedRef.current);
    } catch (error) {
      console.warn("[GEEN realtime] thread catch-up failed", error);
    } finally { busyRef.current = false; }
  }, [post.id]);

  const handleSignal = useCallback((signal: LiveSignal) => {
    if (signal.type === "resync" || signal.post.parentPostId === post.id) void synchronize();
  }, [post.id, synchronize]);
  useLivePosts(handleSignal);

  return (
    <div aria-label="Thread GEEN">
      <PostRow post={post} />
      {replies.length ? replies.map(reply => <PostRow key={reply.id} post={reply} />) : (
        <p className="px-4 py-8 text-[13px] text-muted-foreground md:px-5">Belum ada balasan.</p>
      )}
    </div>
  );
}
