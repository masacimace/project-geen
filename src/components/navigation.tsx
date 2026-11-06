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
  return (
    <nav aria-label={mode === "desktop" ? "Primary" : "Mobile"} className={mode === "mobile" ? "grid grid-cols-4" : "space-y-1"}>
      {links.map(({ href, label, Icon }) => {
        const selected = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "flex items-center justify-center gap-3 rounded-lg text-muted-foreground transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              "min-h-11 px-3 text-[14px] font-medium",
              mode === "desktop" ? "xl:justify-start" : "flex-col gap-1 px-1 text-[11px]",
              selected && "bg-hover text-foreground",
            )}
          >
            <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
            <span className={mode === "desktop" ? "hidden xl:inline" : undefined}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
