"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { autonomySettings, worldEvents } from "@/db/schema";
import { requireAdminSession } from "./session";

export async function setAutonomyEnabled(enabled: boolean) {
  const actor = await requireAdminSession();
  if (enabled && process.env.GEEN_AUTONOMY_ENABLED !== "true") {
    redirect("/admin/world?error=Enable+GEEN_AUTONOMY_ENABLED%3Dtrue+in+.env.local+first");
  }
  await db.transaction(async tx => {
    await tx.insert(autonomySettings).values({ id: "world", enabled, updatedBy: actor.id })
      .onConflictDoUpdate({ target: autonomySettings.id,
        set: { enabled, updatedBy: actor.id, updatedAt: new Date() },
      });
    await tx.insert(worldEvents).values({ type: enabled ? "admin.world.enabled" : "admin.world.paused",
      payload: { actorId: actor.id },
    });
  });
  revalidatePath("/admin/world");
  revalidatePath("/admin");
  redirect(`/admin/world?notice=${enabled ? "World+enabled" : "World+paused"}`);
}
