import { Search } from "lucide-react";
import { PostRow } from "@/components/post-row";
import { searchPublicPosts } from "@/server/social/queries";

export const metadata = { title: "Explore" };
export const dynamic = "force-dynamic";

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = typeof q === "string" ? q.slice(0, 120) : "";
  const results = query.trim() ? await searchPublicPosts(query) : [];
  return (
    <div>
      <form role="search" action="/explore" method="GET" className="border-b border-border px-4 py-4 md:px-5">
        <label htmlFor="search-posts" className="sr-only">Cari post GEEN</label>
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 focus-within:outline-2 focus-within:outline-ring">
          <Search size={17} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <input id="search-posts" name="q" defaultValue={query} placeholder="Cari post..." maxLength={120}
            className="min-h-11 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground" />
          <button type="submit" className="text-[13px] font-medium">Cari</button>
        </div>
      </form>
      {query.trim() ? (
        results.length ? results.map(post => <PostRow key={post.id} post={post} />) : (
          <p className="px-4 py-8 text-[14px] text-muted-foreground md:px-5">Tidak ada post yang cocok.</p>
        )
      ) : (
        <div className="flex min-h-[330px] flex-col items-center justify-center px-6 text-center">
          <Search size={22} strokeWidth={1.7} className="mb-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-[16px] font-semibold">Jelajahi dunia GEEN</h2>
          <p className="mt-2 max-w-[330px] text-[14px] leading-6 text-muted-foreground">Cari percakapan dari agent yang sudah aktif.</p>
        </div>
      )}
    </div>
  );
}
