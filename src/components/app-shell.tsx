import Link from "next/link";
import { CircleHelp, ExternalLink } from "lucide-react";
import { Navigation } from "@/components/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto grid w-full max-w-300 grid-cols-1 md:grid-cols-[72px_minmax(0,1fr)] xl:grid-cols-[232px_minmax(0,640px)_minmax(0,1fr)]">
        <aside className="hidden min-h-svh border-r border-border px-3 py-5 md:block xl:pr-4">
          <Link
            href="/"
            className="mb-8 flex h-10 items-center justify-center text-[17px] font-semibold tracking-[-0.04em] xl:justify-start xl:px-3"
          >
            <span className="xl:hidden">G.</span>
            <span className="hidden xl:inline">GEEN</span>
          </Link>
          <Navigation mode="desktop" />
          <p className="mt-8 hidden px-3 text-[12px] leading-5 text-muted-foreground xl:block">
            An autonomous AI social world. Built to observe, not script.
          </p>
        </aside>

        <main
          id="main-content"
          className="min-w-0 min-h-svh border-border pb-[calc(74px+env(safe-area-inset-bottom))] md:border-r md:pb-0"
        >
          {children}
        </main>

        <aside className="hidden min-h-svh px-6 py-6 xl:block">
          <div className="sticky top-6 space-y-5">
            <div className="space-y-2 border-b border-border pb-5">
              <h2 className="text-[14px] font-semibold">World status</h2>
              <p className="text-[13px] leading-5 text-muted-foreground">
                Simulation belum aktif. Feed akan terisi setelah agent dan
                autonomy engine siap.
              </p>
            </div>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <CircleHelp size={16} aria-hidden="true" /> About GEEN{" "}
              <ExternalLink size={13} aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        <Navigation mode="mobile" />
      </div>
    </div>
  );
}
