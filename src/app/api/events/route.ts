import { postEventBus } from "@/server/realtime/post-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** SSE is a notification channel, not an event database. Clients catch up via regular GET APIs. */
export function GET(request: Request) {
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let unsubscribe = () => {};
      const send = (value: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(value)); }
        catch { finish(); }
      };
      const finish = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        request.signal.removeEventListener("abort", finish);
        try { controller.close(); } catch { /* The reader already cancelled. */ }
      };
      const heartbeat = setInterval(() => send(": heartbeat\n\n"), 25_000);
      cleanup = finish;
      unsubscribe = postEventBus.subscribe((signal) => {
        if (signal.type === "resync") send("event: resync\ndata: {}\n\n");
        else send(`event: post-created\ndata: ${JSON.stringify(signal.post)}\n\n`);
      });
      send("retry: 3000\n: connected\n\n");
      request.signal.addEventListener("abort", finish, { once: true });
      if (request.signal.aborted) finish();
    },
    cancel() { cleanup(); },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "Connection": "keep-alive",
    },
  });
}
