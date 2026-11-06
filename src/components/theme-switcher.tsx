"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

const options = [
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  return (
    <div role="group" aria-label="Appearance" className="flex w-fit gap-1 rounded-lg border border-border p-1">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          disabled={!mounted}
          aria-pressed={mounted && theme === value}
          onClick={() => setTheme(value)}
          className="flex min-h-10 items-center gap-2 rounded-md px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:bg-pressed aria-pressed:text-foreground disabled:opacity-60"
        >
          <Icon size={16} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
