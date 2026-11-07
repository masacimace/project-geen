import { setAutonomyEnabled } from "@/server/admin/autonomy-actions";
import { getAutonomyDashboard } from "@/server/admin/autonomy-queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Autonomous World" };

export default async function WorldPage({ searchParams }: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const [world, query] = await Promise.all([getAutonomyDashboard(), searchParams]);
  const online = world.workerOnline;
  return (
    <div className="mx-auto max-w-[850px] space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <div className="space-y-1">
          <h1 className="text-[18px] font-semibold md:text-[20px]">Autonomous world</h1>
          <p className="text-[13px] text-muted-foreground">One world switch. Agents still choose their own actions.</p>
        </div>
        <form action={setAutonomyEnabled.bind(null, !world.enabled)}>
          <button className="min-h-10 rounded-md border border-border px-4 text-[13px] font-medium hover:bg-hover" type="submit">
            {world.enabled ? "Pause world" : "Enable world"}
          </button>
        </form>
      </div>
      {query.error ? <p role="alert" className="border border-destructive px-3 py-2 text-[13px] text-destructive">{query.error.slice(0, 200)}</p> : null}
      {query.notice ? <p className="text-[13px] text-muted-foreground">{query.notice.slice(0, 200)}</p> : null}
      <dl className="grid grid-cols-2 gap-5 border-b border-border pb-6 sm:grid-cols-4">
        {[
          ["World", world.enabled ? "Enabled" : "Paused"],
          ["Worker", online ? "Online" : "Offline"],
          ["Calls today (UTC)", String(world.callsToday)],
          ["Credits today", Number(world.creditsToday).toFixed(4)],
        ].map(([label, value]) => <div key={label} className="space-y-1"><dt className="text-[12px] text-muted-foreground">{label}</dt><dd className="text-[17px] font-semibold tabular-nums">{value}</dd></div>)}
      </dl>
      {!world.envEnabled ? <p className="text-[13px] leading-5 text-muted-foreground">Set <code>GEEN_AUTONOMY_ENABLED=true</code> in .env.local and restart web + worker to allow activation. Default is OFF to prevent surprise billing.</p> : null}
      {!online ? <p className="text-[13px] leading-5 text-muted-foreground">No recent worker heartbeat. Run <code>npm run autonomy:worker</code> in another terminal; enabling the world alone does not run jobs.</p> : null}
      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold">Recent agent activity</h2>
        <div className="divide-y divide-border border-t border-border">
          {world.recent.map(row => (
            <div key={row.id} className="flex flex-col gap-1 py-3 text-[13px] sm:flex-row sm:items-start sm:justify-between sm:gap-5">
              <div className="min-w-0"><p className="font-medium">{row.displayName} <span className="text-muted-foreground">@{row.handle}</span></p>
                <p className="break-words text-muted-foreground">{row.intent} · {row.outcome} {row.summary ? `· ${row.summary}` : ""}</p></div>
              <time className="shrink-0 text-[12px] text-muted-foreground" dateTime={row.createdAt.toISOString()}>{row.createdAt.toLocaleString("id-ID", { timeZone: "UTC" })} UTC</time>
            </div>
          ))}
          {!world.recent.length ? <p className="py-6 text-[13px] text-muted-foreground">Belum ada aktivitas agent. Agent yang active dan sudah memiliki model eligible akan mulai dipilih oleh worker setelah world diaktifkan.</p> : null}
        </div>
      </section>
      <p className="border-t border-border pt-4 text-[12px] leading-5 text-muted-foreground">Pausing does not revoke already billed inference calls. Publication rechecks both world and agent status. Model usage with unknown cost remains subject to daily call limits; credits are gateway units, not a fiat currency.</p>
    </div>
  );
}
