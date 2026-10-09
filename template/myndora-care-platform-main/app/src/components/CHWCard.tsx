// Patient-visible CHW card. Admin-only artefacts (NIN, exact address, certificates,
// references) are intentionally never rendered here.
import { BadgeCheck, Clock, Languages, MapPin, Star } from 'lucide-react';
import type { CHWProfile } from '@/types';
import { Badge } from '@/components/kit';
import { initials } from '@/lib/format';

export default function CHWCard({
  chw, reasons, concerns, selected, actions,
}: {
  chw: CHWProfile;
  reasons?: string[];
  concerns?: string[];
  selected?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border p-4 bg-white ${selected ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/20' : 'border-slate-200'}`}>
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-full grid place-items-center text-white font-bold shrink-0"
          style={{ background: 'linear-gradient(135deg,var(--accent),#19c6b2)' }}
          aria-hidden
        >
          {initials(chw.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-900">{chw.name}</span>
            {chw.photoVerified && chw.status === 'approved' && (
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-700">
                <BadgeCheck size={14} /> Verified
              </span>
            )}
            {selected && <Badge tone="blue">Selected</Badge>}
            {chw.matchingSuspended && <Badge tone="red">Matching suspended</Badge>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{chw.cadre} · {chw.yearsExperience} yrs experience</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1"><Star size={13} className="text-amber-500" /> {chw.rating > 0 ? `${chw.rating} (${chw.reviewCount} verified)` : 'No ratings yet'}</span>
            <span className="inline-flex items-center gap-1"><MapPin size={13} /> {chw.serviceArea} · {chw.distanceKm} km</span>
            <span className="inline-flex items-center gap-1"><Clock size={13} /> ~{chw.etaMinutes} min away</span>
            <span className="inline-flex items-center gap-1"><Languages size={13} /> {chw.languages.join(', ')}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge tone={chw.available && !chw.matchingSuspended ? 'green' : 'gray'}>
              {chw.matchingSuspended ? 'Unavailable' : chw.available ? 'Available' : 'Unavailable'}
            </Badge>
            <Badge tone="gray">{chw.completedVisits} completed visits</Badge>
            {chw.approvedServices.slice(0, 3).map((s) => <Badge key={s} tone="indigo">{s.replace('_', ' ')}</Badge>)}
          </div>
        </div>
      </div>

      {reasons && reasons.length > 0 && (
        <div className="mt-3 rounded-xl bg-emerald-50/60 border border-emerald-100 p-3">
          <p className="text-xs font-bold text-emerald-800 mb-1">Why recommended</p>
          <ul className="text-xs text-emerald-900 space-y-0.5 list-disc pl-4">
            {reasons.slice(0, 4).map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
      )}
      {concerns && concerns.length > 0 && (
        <ul className="mt-2 text-xs text-amber-700 space-y-0.5 list-disc pl-4">
          {concerns.map((c) => <li key={c}>{c}</li>)}
        </ul>
      )}
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
