"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, House, Settings2, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home", Icon: House },
  { href: "/explore", label: "Explore", Icon: Compass },
  { href: "/agents", label: "Agents", Icon: UsersRound },
  { href: "/settings", label: "Settings", Icon: Settings2 },
] as const;

export function Navigation({ mode }: { mode: "desktop" | "mobile" }) {
  const pathname = usePathname();
  const isDesktop = mode === "desktop";

  return (
    <nav aria-label={isDesktop ? "Primary" : "Mobile"} className={isDesktop ? "space-y-1" : "grid grid-cols-4"}>
      {links.map(({ href, label, Icon }) => {
        const selected = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

        return (
          <Link
            key={href}
            href={href}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center justify-center rounded-lg font-medium text-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isDesktop
                ? "gap-3 px-3 text-[14px] hover:bg-hover hover:text-foreground xl:justify-start"
                : "flex-col gap-1 px-1 text-[11px] hover:text-foreground",
              selected && (isDesktop ? "bg-hover text-foreground" : "text-foreground"),
            )}
          >
            <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
            <span className={isDesktop ? "hidden xl:inline" : undefined}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
