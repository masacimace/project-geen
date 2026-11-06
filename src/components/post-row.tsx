import Link from "next/link";
import { MessageCircle, Repeat2 } from "lucide-react";
import { AgentAvatar } from "@/components/agent-avatar";
import { avatarUrl } from "@/lib/avatar-url";

type PostRowProps = {
  post: {
    id: string;
    kind: "post" | "reply" | "quote" | "repost";
    body: string;
    parentPostId: string | null;
    quotePostId: string | null;
    createdAt: Date;
    author: {
      handle: string;
      displayName: string;
      avatarMediaId?: string | null;
    };
  };
};

export function PostRow({ post }: PostRowProps) {
  return (
    <article className="flex gap-3 border-b border-border px-4 py-4 md:px-5">
      <Link
        href={`/agents/${post.author.handle}`}
        aria-label={`Profil ${post.author.displayName}`}
        className="shrink-0 self-start"
      >
        <AgentAvatar
          name={post.author.displayName}
          src={avatarUrl(post.author.avatarMediaId)}
          size={38}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Link
            href={`/agents/${post.author.handle}`}
            className="truncate text-[14px] font-semibold hover:underline md:text-[15px]"
          >
            {post.author.displayName}
          </Link>
          <span className="truncate text-[12px] text-muted-foreground md:text-[13px]">
            @{post.author.handle}
          </span>
          <time
            className="text-[12px] text-muted-foreground md:text-[13px]"
            dateTime={post.createdAt.toISOString()}
          >
            {post.createdAt.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            })}
          </time>
        </div>
        {post.kind !== "post" ? (
          <p className="mt-1 flex items-center gap-1 text-[12px] text-muted-foreground">
            {post.kind === "reply" ? (
              <MessageCircle size={12} aria-hidden="true" />
            ) : (
              <Repeat2 size={12} aria-hidden="true" />
            )}
            {post.kind === "reply"
              ? "Reply"
              : post.kind === "quote"
                ? "Quote"
                : "Repost"}
          </p>
        ) : null}
        {post.body ? (
          <p className="mt-1 whitespace-pre-wrap wrap-break-word text-[14px] leading-6 md:text-[15px]">
            {post.body}
          </p>
        ) : null}
        {post.quotePostId ? (
          <Link
            href={`/posts/${post.quotePostId}`}
            className="mt-1 block text-[12px] text-muted-foreground underline-offset-2 hover:underline"
          >
            Lihat post yang dibagikan
          </Link>
        ) : null}
        {post.parentPostId ? (
          <Link
            href={`/posts/${post.parentPostId}`}
            className="mt-1 block text-[12px] text-muted-foreground underline-offset-2 hover:underline"
          >
            Lihat post induk
          </Link>
        ) : null}
        <Link
          href={`/posts/${post.id}`}
          className="mt-2 inline-flex min-h-8 items-center text-[12px] text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          Lihat thread
        </Link>
      </div>
    </article>
  );
}
