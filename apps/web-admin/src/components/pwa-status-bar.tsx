"use client";

import { useEffect, useState } from "react";
import { pendingCount, subscribeQueue } from "@/lib/offline-queue";
import { syncNow } from "@/lib/care-sync";
import { flagEnabled, loadFlags } from "@/lib/platform-state";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

export function PwaStatusBar() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHelp, setIosHelp] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(true);

  useEffect(() => {
    const refresh = () => {
      setOnline(navigator.onLine);
      void pendingCount().then(setPending);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
      setInstalled(standalone);
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      setIosHelp(ios && !standalone);
    };
    refresh();
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("beforeinstallprompt", onPrompt);
    const unsubscribe = subscribeQueue(refresh);
    void loadFlags().then((flags) => setSyncEnabled(flagEnabled(flags, "offline_sync_queue")));
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      unsubscribe();
    };
  }, []);

  async function onSync() {
    setSyncing(true);
    await syncNow();
    setPending(await pendingCount());
    setSyncing(false);
  }

  const label = !online
    ? "Offline Mode • Saving Locally"
    : pending > 0
      ? `Pending Sync (${pending} items)`
      : "Online • Synced";

  return (
    <div className="flex flex-col gap-2 border-t border-line px-4 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
      <p className="font-semibold">{label}</p>
      <div className="flex flex-wrap gap-2">
        {syncEnabled ? (
          <button
            type="button"
            onClick={() => void onSync()}
            disabled={syncing || !online}
            className="min-h-9 rounded-full border border-line bg-white px-3 font-semibold disabled:opacity-50"
          >
            {syncing ? "Syncing..." : "Sync Now"}
          </button>
        ) : null}
        {installEvent && !installed ? (
          <button
            type="button"
            onClick={() => void installEvent.prompt()}
            className="min-h-9 rounded-full bg-primary px-3 font-semibold text-white"
          >
            Install Myndora Care App
          </button>
        ) : null}
      </div>
      {iosHelp && !installEvent ? (
        <p className="text-muted">
          Install Myndora Care App: in Safari, tap Share, then Add to Home Screen.
        </p>
      ) : null}
    </div>
  );
}
