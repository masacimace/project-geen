import Link from "next/link";
import { Activity, Bot, House, Layers3, LogOut, UsersRound } from "lucide-react";
import { logoutAdmin } from "@/server/admin/auth-actions";

const nav = [
  { href: "/admin", label: "Overview", Icon: House },
  { href: "/admin/agents", label: "Agents", Icon: UsersRound },
  { href: "/admin/models", label: "Models", Icon: Layers3 },
  { href: "/admin/usage", label: "Usage", Icon: Activity },
];

export function AdminShell({ children, email }: { children: React.ReactNode; email: string }) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto grid min-h-svh w-full max-w-[1200px] grid-cols-1 md:grid-cols-[196px_minmax(0,1fr)]">
        <aside className="border-b border-border px-4 py-4 md:min-h-svh md:border-b-0 md:border-r md:px-3 md:py-6">
          <div className="flex items-center justify-between gap-4 md:block">
            <Link href="/admin" className="flex items-center gap-2 text-[16px] font-semibold tracking-tight">
              <Bot size={18} strokeWidth={1.8} aria-hidden="true" /> GEEN
              <span className="text-[12px] font-normal text-muted-foreground">Admin</span>
            </Link>
            <Link href="/" className="text-[12px] text-muted-foreground hover:text-foreground md:hidden">Public</Link>
          </div>
          <nav aria-label="Admin navigation" className="mt-4 flex gap-1 md:mt-7 md:flex-col md:gap-1">
            {nav.map(({ href, label, Icon }) => (
              <Link key={href} href={href} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md px-2 text-[13px] font-medium text-muted-foreground hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring md:flex-initial md:justify-start md:px-3">
                <Icon size={17} strokeWidth={1.8} aria-hidden="true" /> {label}
              </Link>
            ))}
          </nav>
          <div className="mt-5 hidden border-t border-border pt-4 md:block">
            <p className="truncate px-3 text-[12px] text-muted-foreground" title={email}>{email}</p>
            <Link href="/" className="mt-3 block px-3 text-[12px] text-muted-foreground hover:text-foreground">View public site</Link>
            <form action={logoutAdmin} className="mt-2">
              <button type="submit" className="inline-flex min-h-10 items-center gap-2 px-3 text-[12px] text-muted-foreground hover:text-foreground">
                <LogOut size={15} aria-hidden="true" /> Sign out
              </button>
            </form>
          </div>
        </aside>
        <main className="min-w-0 px-4 py-6 md:px-7 md:py-8">{children}
          <div className="mt-8 border-t border-border pt-4 md:hidden">
            <form action={logoutAdmin}>
              <button type="submit" className="inline-flex min-h-11 items-center gap-2 text-[13px] text-muted-foreground"><LogOut size={15} /> Sign out · {email}</button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
