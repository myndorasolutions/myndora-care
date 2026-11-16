export type LocalSyncStatus = "draft" | "pending_sync" | "synced" | "failed_sync";

export type QueueKind =
  | "vital"
  | "visit"
  | "alert"
  | "refill"
  | "dispute"
  | "consultation"
  | "provider"
  | "assignment"
  | "plan"
  | "setting"
  | "audit"
  | "payment"
  | "notification";

export type QueueRecord = {
  id: string;
  kind: QueueKind;
  op: "insert" | "update";
  mode: "demo" | "live";
  payload: Record<string, unknown>;
  recordedAtLocal: string;
  syncedAtServer: string | null;
  syncStatus: LocalSyncStatus;
  serverId?: string;
};

const DB_NAME = "myndora-care";
const STORE = "queue";
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeQueue(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = run(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listQueue(): Promise<QueueRecord[]> {
  if (typeof indexedDB === "undefined") return [];
  const rows = await withStore<QueueRecord[]>("readonly", (store) => store.getAll());
  return rows
    .map((row) => ({ ...row, op: row.op ?? "insert" }))
    .sort((a, b) => a.recordedAtLocal.localeCompare(b.recordedAtLocal));
}

export async function pendingCount() {
  const rows = await listQueue();
  return rows.filter(
    (row) => row.mode === "live" && (row.syncStatus === "pending_sync" || row.syncStatus === "failed_sync"),
  ).length;
}

export async function enqueue(
  input: Omit<QueueRecord, "syncedAtServer" | "syncStatus" | "op"> & {
    syncStatus?: LocalSyncStatus;
    op?: QueueRecord["op"];
  },
): Promise<QueueRecord> {
  const existing = (await listQueue()).find((row) => row.id === input.id);
  const keepInsert = existing?.op === "insert" && existing.syncStatus !== "synced" && input.op === "update";
  const record: QueueRecord = {
    syncedAtServer: null,
    ...existing,
    ...input,
    op: keepInsert ? "insert" : (input.op ?? existing?.op ?? "insert"),
    payload: existing ? { ...existing.payload, ...input.payload } : input.payload,
    syncStatus: input.syncStatus ?? "pending_sync",
    id: input.id,
  };
  if (typeof indexedDB !== "undefined") {
    await withStore("readwrite", (store) => store.put(record));
  }
  notify();
  return record;
}

export async function updateQueue(id: string, patch: Partial<QueueRecord>) {
  const rows = await listQueue();
  const current = rows.find((row) => row.id === id);
  if (!current || typeof indexedDB === "undefined") return;
  const next = { ...current, ...patch, id: current.id };
  await withStore("readwrite", (store) => store.put(next));
  notify();
}
