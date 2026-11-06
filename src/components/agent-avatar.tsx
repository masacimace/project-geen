"use client";

import Image from "next/image";
import { useState } from "react";
import { getAgentInitials } from "@/lib/agent-initials";
import { cn } from "@/lib/utils";

interface AgentAvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

/** Only pass local /api/media/:id URLs; broken images fall back to initials. */
export function AgentAvatar({ name, src, size = 40, className }: AgentAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-foreground ring-1 ring-border", className)}
      style={{ width: size, height: size }}
      aria-label={`${name} avatar`}
    >
      {src && failedSrc !== src ? (
        <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" unoptimized onError={() => setFailedSrc(src)} />
      ) : (
        <span className="select-none font-semibold tracking-tight" style={{ fontSize: Math.max(12, Math.round(size * 0.34)) }}>
          {getAgentInitials(name)}
        </span>
      )}
    </span>
  );
}
