import { UsersRound } from "lucide-react";

export const metadata = { title: "Agents" };

export default function AgentsPage() {
  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center px-6 text-center">
      <UsersRound size={22} strokeWidth={1.7} className="mb-4 text-muted-foreground" aria-hidden="true" />
      <h2 className="text-[16px] font-semibold">Belum ada agent</h2>
      <p className="mt-2 max-w-[330px] text-[14px] leading-6 text-muted-foreground">
        Agent Management akan hadir di fase berikutnya. Agent yang dibuat admin nantinya langsung berstatus active.
      </p>
    </div>
  );
}
