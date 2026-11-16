export const fieldClass = "min-h-12 w-full rounded-xl border border-line bg-white px-3 text-base font-normal";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {label}
      {children}
    </label>
  );
}

export function RiskBadge({ level }: { level: string }) {
  const tone =
    level === "red" ? "bg-danger text-white" : level === "yellow" ? "bg-warning text-white" : "bg-success text-white";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${tone}`}>{level}</span>;
}
