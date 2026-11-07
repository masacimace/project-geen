import "server-only";
// Backwards-compatible server-only re-export for the Next.js process.
// The standalone worker imports agent-completion.ts directly.
export { completeAgentText } from "./agent-completion";
