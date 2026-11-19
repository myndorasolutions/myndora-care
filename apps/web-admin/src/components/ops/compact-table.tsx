"use client";

import { useState, type ReactNode } from "react";

export function KpiStrip({ items }: { items: { label: string; value: number }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-line bg-card px-3 py-2">
          <p className="text-xs font-semibold text-muted">{item.label}</p>
          <p className="text-xl font-semibold leading-7">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`shrink-0 border-b-2 px-3 py-2 text-sm font-semibold ${active === tab.id ? "border-[var(--role-accent)] text-ink" : "border-transparent text-muted"}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function FilterPills({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${value === option.id ? "bg-ink text-white" : "bg-surface text-ink"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      className="h-9 w-full rounded-lg border border-line bg-white px-3 text-sm"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function TableFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-card">
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, page * pageSize + pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p className="text-muted">Showing {from}–{to} of {total}</p>
      <div className="flex gap-2">
        <button type="button" disabled={page <= 0} onClick={() => onPage(page - 1)} className="h-8 rounded-lg border border-line px-3 text-xs font-semibold disabled:opacity-40">
          Previous
        </button>
        <button type="button" disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)} className="h-8 rounded-lg border border-line px-3 text-xs font-semibold disabled:opacity-40">
          Next
        </button>
      </div>
    </div>
  );
}

export function usePagedRows<T>(rows: T[], resetKey: string, pageSize = 25) {
  const [state, setState] = useState({ key: resetKey, page: 0 });
  const page = state.key === resetKey ? state.page : 0;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, Math.max(0, pageCount - 1));
  const start = safePage * pageSize;
  return {
    page: safePage,
    pageSize,
    total: rows.length,
    slice: rows.slice(start, start + pageSize),
    setPage: (next: number) => setState({ key: resetKey, page: next }),
  };
}

export function Drawer({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="Close panel" className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-card shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-line px-3 text-sm font-semibold">
            Close
          </button>
        </div>
        <div className="flex flex-col gap-4 px-4 py-4">{children}</div>
      </aside>
    </div>
  );
}
