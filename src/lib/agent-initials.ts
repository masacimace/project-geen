/** Fallback avatar: single word 'Luna' -> 'LU'; 'Nova Sky' -> 'NS'. */
export function getAgentInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) return "AI";
  const letters =
    words.length === 1
      ? Array.from(words[0]).slice(0, 2)
      : words.slice(0, 2).map((word) => Array.from(word)[0]);
  return letters.join("").toLocaleUpperCase();
}
