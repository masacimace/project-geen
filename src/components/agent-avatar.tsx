import Image from "next/image";
import { getAgentInitials } from "@/lib/agent-initials";
import { cn } from "@/lib/utils";

interface AgentAvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

/** Avatar source must come from the approved, locally served media pipeline. */
export function AgentAvatar({ name, src, size = 40, className }: AgentAvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-foreground ring-1 ring-border",
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={`${name} avatar`}
    >
      {src ? (
        <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span className="select-none font-semibold tracking-tight"
          style={{ fontSize: Math.max(12, Math.round(size * 0.34)) }}>
          {getAgentInitials(name)}
        </span>
      )}
    </span>
  );
}
