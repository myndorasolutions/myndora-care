import { pushQueued } from "@/lib/care-client";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { listQueue, updateQueue, type QueueKind, type QueueRecord } from "@/lib/offline-queue";

const KIND_ORDER: Record<QueueKind, number> = {
  vital: 0,
  visit: 1,
  refill: 2,
  dispute: 3,
  alert: 4,
  consultation: 5,
  provider: 6,
  assignment: 7,
  plan: 8,
  setting: 9,
  audit: 10,
  payment: 11,
  notification: 12,
};

export async function syncNow() {
  if (!hasSupabaseEnv() || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return { synced: 0, failed: 0 };
  }
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { synced: 0, failed: 0 };

  const pending = (await listQueue())
    .filter(
      (item) =>
        item.mode === "live" &&
        (item.syncStatus === "pending_sync" || item.syncStatus === "failed_sync"),
    )
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.recordedAtLocal.localeCompare(b.recordedAtLocal));

  let synced = 0;
  let failed = 0;
  const visitIds = new Map<string, string>();
  for (const item of await listQueue()) {
    if (item.kind === "visit" && item.serverId) visitIds.set(item.id, item.serverId);
  }

  for (const item of pending) {
    const payload = { ...item.payload };
    const localVisitId = typeof payload.localVisitId === "string" ? payload.localVisitId : null;
    if (localVisitId) {
      const serverVisitId = visitIds.get(localVisitId);
      if (!serverVisitId) continue;
      payload.visit_id = serverVisitId;
      delete payload.localVisitId;
    }

    const pushed = await pushQueued({ ...item, payload });
    if (!pushed.ok || !pushed.serverId) {
      failed += 1;
      await updateQueue(item.id, { syncStatus: "failed_sync" });
      continue;
    }
    if (item.kind === "visit") visitIds.set(item.id, pushed.serverId);
    synced += 1;
    await updateQueue(item.id, {
      syncStatus: "synced",
      syncedAtServer: new Date().toISOString(),
      serverId: pushed.serverId,
    });
  }

  return { synced, failed };
}

export type { QueueRecord };
