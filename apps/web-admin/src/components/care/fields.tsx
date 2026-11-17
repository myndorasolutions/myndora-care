export const fieldClass = "min-h-12 w-full rounded-xl border border-line bg-white px-3 text-base font-normal";

export function Field({
  label,
  unit,
  children,
}: {
  label: string;
  unit?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {label}
      {unit ? (
        <span className="relative block">
          {children}
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-normal text-muted">{unit}</span>
        </span>
      ) : (
        children
      )}
    </label>
  );
}

export function RiskBadge({ level }: { level: string }) {
  const tone =
    level === "red" ? "bg-danger text-white" : level === "yellow" ? "bg-warning text-white" : "bg-success text-white";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${tone}`}>{level}</span>;
}
