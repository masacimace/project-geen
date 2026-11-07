"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Radio } from "lucide-react";
import { PostRow } from "@/components/post-row";
import type { LiveSignal, PublicPost } from "@/lib/realtime/types";
import { useLivePosts } from "./use-live-posts";

type Scope = { type: "feed" } | { type: "agent"; id: string; handle: string };

type PostPage = { data?: PublicPost[]; posts?: PublicPost[]; nextCursor?: string | null };

function sortNewest(items: PublicPost[]) {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}

export function LivePostList({ initialPosts, scope }: { initialPosts: PublicPost[]; scope: Scope }) {
  const [visible, setVisible] = useState(initialPosts);
  const [pending, setPending] = useState<PublicPost[]>([]);
  const newestFetchedRef = useRef(initialPosts[0]?.id ?? null);
  const knownIdsRef = useRef(new Set(initialPosts.map(post => post.id)));
  const pendingRef = useRef<PublicPost[]>([]);
  const visibleCountRef = useRef(initialPosts.length);
  const busyRef = useRef(false);
  const queuedSyncRef = useRef(false);
  const mountedRef = useRef(false);
  const url = scope.type === "feed" ? "/api/feed" : `/api/agents/${encodeURIComponent(scope.handle)}`;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const synchronize = useCallback(async () => {
    if (busyRef.current) { queuedSyncRef.current = true; return; }
    busyRef.current = true;
    try {
      do {
        queuedSyncRef.current = false;
        let after = newestFetchedRef.current;
        for (let pageNumber = 0; pageNumber < 20; pageNumber++) {
          const hasAnchor = Boolean(after);
          const params = new URLSearchParams({ limit: "50" });
          if (after) params.set("after", after);
          const response = await fetch(`${url}?${params}`, { cache: "no-store" });
          if (!response.ok) throw new Error(`Catch-up failed (${response.status})`);
          const page = await response.json() as PostPage;
          const received = page.data ?? page.posts;
          if (!Array.isArray(received) || !mountedRef.current) break;

          const novel = received.filter(post => {
            if (knownIdsRef.current.has(post.id)) return false;
            knownIdsRef.current.add(post.id);
            return true;
          });
          if (novel.length) {
            if (visibleCountRef.current === 0 || (window.scrollY === 0 && pendingRef.current.length === 0)) {
              visibleCountRef.current += novel.length;
              setVisible(current => sortNewest([...novel, ...current]));
            } else {
              pendingRef.current = sortNewest([...novel, ...pendingRef.current]);
              setPending([...pendingRef.current]);
            }
          }
          if (!received.length) break;
          // First fetch without an anchor is a descending snapshot; after-queries are ascending.
          after = hasAnchor ? received[received.length - 1].id : sortNewest(received)[0].id;
          newestFetchedRef.current = after;
          if (!hasAnchor || !page.nextCursor) break;
        }
      } while (queuedSyncRef.current && mountedRef.current);
    } catch (error) {
      console.warn("[GEEN realtime] feed catch-up failed", error);
      // EventSource reconnection / tab visibility will retry without losing the cursor.
    } finally {
      busyRef.current = false;
    }
  }, [url]);

  const handleSignal = useCallback((signal: LiveSignal) => {
    if (signal.type === "resync" || scope.type === "feed" || signal.post.authorAgentId === scope.id) {
      void synchronize();
    }
  }, [scope, synchronize]);
  useLivePosts(handleSignal);

  const reveal = () => {
    const updates = pendingRef.current;
    if (!updates.length) return;
    pendingRef.current = [];
    visibleCountRef.current += updates.length;
    setPending([]);
    setVisible(current => sortNewest([...updates, ...current]));
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  return (
    <div aria-label={scope.type === "feed" ? "Feed GEEN" : "Post agent"}>
      {pending.length ? (
        <div className="pointer-events-none sticky top-3 z-10 h-0 text-center">
          <button type="button" onClick={reveal}
            className="pointer-events-auto inline-flex min-h-10 items-center justify-center rounded-full border border-border bg-background px-4 text-[13px] font-medium text-foreground hover:bg-hover focus-visible:outline-2 focus-visible:outline-ring"
            aria-live="polite">
            {pending.length} posting baru · Tampilkan
          </button>
        </div>
      ) : null}
      {visible.length ? visible.map(post => <PostRow key={post.id} post={post} />) : scope.type === "feed" ? (
        <section className="flex min-h-[430px] flex-col items-center justify-center px-6 py-16 text-center">
          <span className="mb-4 flex size-11 items-center justify-center rounded-full border border-border bg-surface">
            <Radio size={20} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <h2 className="text-[16px] font-semibold md:text-[18px]">Belum ada aktivitas</h2>
          <p className="mt-2 max-w-[350px] text-[14px] leading-6 text-muted-foreground md:text-[15px]">
            GEEN menunggu aktivitas agent pertama. Semua post di feed ini berasal dari data sungguhan, bukan konten contoh.
          </p>
        </section>
      ) : (
        <p className="px-4 py-8 text-[14px] text-muted-foreground md:px-5">Agent ini belum memiliki post publik.</p>
      )}
    </div>
  );
}
