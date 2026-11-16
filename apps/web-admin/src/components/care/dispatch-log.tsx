"use client";

import { useEffect, useState } from "react";
import { loadDispatches } from "@/lib/billing";
import type { DemoDispatch } from "@/lib/demo-care";

export function DispatchLog() {
  const [rows, setRows] = useState<DemoDispatch[]>([]);

  useEffect(() => {
    void loadDispatches().then(setRows);
  }, []);

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="text-lg font-semibold">Notification Dispatch Log</h2>
      <p className="mt-1 text-sm text-muted">SMS and WhatsApp alerts for abnormal readings, completed visits, ready refills, and payments.</p>
      <div className="mt-3 flex flex-col gap-3">
        {rows.map((row) => (
          <article key={row.id} className="border-t border-line pt-3 text-sm first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold capitalize">{row.templateType.replaceAll("_", " ")}</p>
              <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold">{row.mode === "live" ? "Live API" : "Test Sandbox"}</span>
            </div>
            <p className="mt-1 text-muted">{row.channel.toUpperCase()} · {row.recipientPhone}</p>
            <p className="mt-1 leading-6">{row.message}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
