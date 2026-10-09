// Shared UI kit — buttons, badges, cards, fields, stats.
import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Inbox } from 'lucide-react';

export function Btn({
  variant = 'primary', size, className = '', ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'danger-soft' | 'ghost'; size?: 'sm' | 'lg' }) {
  const cls = [
    'mc-btn',
    variant === 'primary' ? 'mc-btn-primary' : '',
    variant === 'secondary' ? 'mc-btn-secondary' : '',
    variant === 'danger' ? 'mc-btn-danger' : '',
    variant === 'danger-soft' ? 'mc-btn-danger-soft' : '',
    variant === 'ghost' ? 'mc-btn-ghost' : '',
    size === 'sm' ? 'mc-btn-sm' : '',
    size === 'lg' ? 'mc-btn-lg' : '',
    className,
  ].filter(Boolean).join(' ');
  return <button type="button" className={cls} {...props} />;
}

export type BadgeTone = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'indigo' | 'gray';

export function Badge({ tone = 'gray', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`mc-badge mc-badge-${tone}`}>{children}</span>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`mc-card ${className}`}>{children}</section>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function KV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mc-kv">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-right">{children}</span>
    </div>
  );
}

export function StatCard({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: BadgeTone }) {
  return (
    <div className="bg-white text-slate-900 rounded-xl p-4 min-h-[104px] flex flex-col justify-between shadow-sm">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="text-2xl font-extrabold mt-1">{value}</div>
      {hint && <div className="mt-1">{typeof hint === 'string' ? <Badge tone={tone ?? 'gray'}>{hint}</Badge> : hint}</div>}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 text-slate-500">
      <Inbox size={32} className="mb-3 text-slate-300" />
      <p className="font-semibold text-slate-700">{title}</p>
      {hint && <p className="text-sm mt-1 max-w-sm">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="mc-label">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="mc-input" {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="mc-input min-h-[88px]" {...props} />;
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="mc-input" {...props}>{children}</select>;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${checked ? 'bg-[var(--accent,var(--blue))]' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export function LockedFeature({ feature, requiredPackage }: { feature: string; requiredPackage: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
      <span className="font-semibold text-slate-800">{feature}</span> is available with the{' '}
      <span className="font-semibold">{requiredPackage}</span> package or higher.
    </div>
  );
}
