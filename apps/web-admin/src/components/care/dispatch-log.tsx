"use client";

import { useEffect, useState } from "react";
import { loadDispatches } from "@/lib/billing";
import type { DemoDispatch } from "@/lib/demo-care";
import { Pager, SearchField, TableFrame, usePagedRows } from "@/components/ops/compact-table";

export function DispatchLog() {
  const [rows, setRows] = useState<DemoDispatch[]>([]);
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState("all");

  useEffect(() => {
    void loadDispatches().then(setRows);
  }, []);

  const filtered = rows.filter((row) => {
    if (channel !== "all" && row.channel !== channel) return false;
    const haystack = `${row.templateType} ${row.recipientPhone} ${row.message} ${row.channel}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  const page = usePagedRows(filtered, `${query}|${channel}`);

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">SMS / WhatsApp dispatch</h2>
        <p className="text-sm text-muted">Alerts for abnormal readings, completed visits, ready refills, and payments.</p>
      </div>
      <SearchField value={query} onChange={setQuery} placeholder="Search phone, channel, or message" />
      <div className="flex flex-wrap gap-1.5">
        {[
          ["all", "All"],
          ["sms", "SMS"],
          ["whatsapp", "WhatsApp"],
        ].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setChannel(id)} className={`rounded-full px-3 py-1 text-xs font-semibold ${channel === id ? "bg-ink text-white" : "bg-surface"}`}>
            {label}
          </button>
        ))}
      </div>
      <TableFrame>
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <th className="px-3 py-2 font-semibold">When</th>
            <th className="px-3 py-2 font-semibold">Channel</th>
            <th className="px-3 py-2 font-semibold">Type</th>
            <th className="px-3 py-2 font-semibold">Recipient</th>
            <th className="px-3 py-2 font-semibold">Message</th>
            <th className="px-3 py-2 font-semibold">Mode</th>
          </tr>
        </thead>
        <tbody>
          {page.slice.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-4 text-muted">No messages match this view.</td>
            </tr>
          ) : page.slice.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-b-0">
              <td className="whitespace-nowrap px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
              <td className="px-3 py-2 uppercase">{row.channel}</td>
              <td className="px-3 py-2 capitalize">{row.templateType.replaceAll("_", " ")}</td>
              <td className="whitespace-nowrap px-3 py-2">{row.recipientPhone}</td>
              <td className="max-w-sm truncate px-3 py-2" title={row.message}>{row.message}</td>
              <td className="px-3 py-2">{row.mode === "live" ? "Live" : "Test"}</td>
            </tr>
          ))}
        </tbody>
      </TableFrame>
      <Pager page={page.page} pageSize={page.pageSize} total={page.total} onPage={page.setPage} />
    </section>
  );
}
