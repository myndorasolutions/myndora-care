// Server persistence for the portal world: each signed-in account's demo state
// is saved to the database (debounced) and restored on login — a returning tester
// finds their previously created UAT data.
import { api } from '@/lib/api';
import { buildSeed } from '@/data/seed';
import { useStore, type Store } from '@/store/useStore';

const EXTRA_KEYS = ['currentRole', 'payments', 'clinicianAvailable', 'activeVisit', 'identity', 'messages', 'selectedPatientId', 'packageAvailability'] as const;

export function snapshotState(s: Store): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(buildSeed()) as (keyof ReturnType<typeof buildSeed>)[]) out[k] = s[k];
  for (const k of EXTRA_KEYS) out[k] = s[k];
  return out;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let syncing = false;

/** Start persisting store changes to the backend for the signed-in account. */
export function startStateSync() {
  if (syncing) return;
  syncing = true;
  useStore.subscribe((s, prev) => {
    if (s === prev) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      api.state.save.mutate({ payload: JSON.stringify(snapshotState(useStore.getState())) }).catch(() => {
        // offline / preview without backend — localStorage persist remains the fallback
      });
    }, 1200);
  });
}

/** Restore the account's saved world; returns true when a snapshot existed. */
export async function hydrateFromServer(): Promise<boolean> {
  try {
    const res = await api.state.load.query();
    if (res?.payload) {
      useStore.getState().hydrate(JSON.parse(res.payload) as Record<string, unknown>);
      return true;
    }
  } catch {
    // no backend reachable — keep the local seed
  }
  return false;
}

/** Save immediately (used after reset and onboarding). */
export function saveNow() {
  if (saveTimer) clearTimeout(saveTimer);
  return api.state.save.mutate({ payload: JSON.stringify(snapshotState(useStore.getState())) }).catch(() => undefined);
}
