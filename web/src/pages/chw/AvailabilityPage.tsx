import { useEffect, useState } from 'react';
import { Badge, Btn, Card, PageHeader, Toggle } from '@/components/kit';

const STORAGE_KEY = 'myndora-chw-availability';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

type AvailabilityState = {
  accepting: boolean;
  days: string[];
  radiusKm: number;
};

const DEFAULT: AvailabilityState = {
  accepting: true,
  days: ['Mon', 'Wed', 'Fri'],
  radiusKm: 8,
};

function loadAvailability(): AvailabilityState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<AvailabilityState>;
    return {
      accepting: parsed.accepting ?? DEFAULT.accepting,
      days: Array.isArray(parsed.days) ? parsed.days : DEFAULT.days,
      radiusKm: typeof parsed.radiusKm === 'number' ? parsed.radiusKm : DEFAULT.radiusKm,
    };
  } catch {
    return DEFAULT;
  }
}

export function ChwAvailabilityPage() {
  const [state, setState] = useState<AvailabilityState>(DEFAULT);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  useEffect(() => {
    setState(loadAvailability());
  }, []);

  const persist = (next: AvailabilityState) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSavedHint('Saved on this device only — not synced to the server yet.');
  };

  const toggleDay = (d: string) => {
    const days = state.days.includes(d)
      ? state.days.filter((x) => x !== d)
      : [...state.days, d];
    persist({ ...state, days });
  };

  return (
    <div>
      <PageHeader
        title="Availability"
        subtitle="Control when you prefer to receive work. Preferences are stored locally until a backend availability API exists."
      />

      <Card className="mb-4 border border-amber-200 bg-amber-50">
        <p className="text-sm text-amber-900">
          Local preference only — days and travel radius are not sent to Myndora yet.
        </p>
        {savedHint && <p className="mt-1 text-xs text-amber-800">{savedHint}</p>}
      </Card>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-900">Accepting new assignments</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Turning this off is a personal reminder; it does not pause server offers yet.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={state.accepting ? 'green' : 'gray'}>
              {state.accepting ? 'Available' : 'Unavailable'}
            </Badge>
            <Toggle
              checked={state.accepting}
              onChange={(v) => persist({ ...state, accepting: v })}
              label="Accepting new assignments"
            />
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          Available days
        </p>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <label
              key={d}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                state.days.includes(d)
                  ? 'border-[var(--role-accent,var(--accent))] bg-[var(--accent-soft,#fff7ed)] font-semibold'
                  : 'border-slate-200'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={state.days.includes(d)}
                onChange={() => toggleDay(d)}
                aria-label={`Available ${d}`}
              />
              {d}
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          Travel radius
        </p>
        <p className="mb-3 text-sm text-slate-600">
          You currently prefer visits within <b>{state.radiusKm} km</b> of your base.
        </p>
        <div className="flex flex-wrap gap-2">
          {[3, 5, 8, 12, 20].map((km) => (
            <Btn
              key={km}
              variant={state.radiusKm === km ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => persist({ ...state, radiusKm: km })}
            >
              {km} km
            </Btn>
          ))}
        </div>
      </Card>
    </div>
  );
}
