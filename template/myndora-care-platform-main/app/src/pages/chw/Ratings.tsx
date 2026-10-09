// CHW — Ratings: feedback from verified completed visits only.
import { Star } from 'lucide-react';
import { fmtDate } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { Badge, Card, EmptyState, PageHeader, StatCard } from '@/components/kit';


export default function ChwRatings() {
  const ME = useStore((s) => s.identity.chwId);
  const chw = useStore((s) => s.chws.find((c) => c.id === ME))!;
  const ratings = useStore(useShallow((s) => s.ratings.filter((r) => r.chwId === ME)));
  const patients = useStore((s) => s.patients);

  return (
    <div>
      <PageHeader title="My Ratings" subtitle="Only patients with a verified, confirmed visit can rate you — ratings can't be faked." />
      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <StatCard label="Average rating" value={`★ ${chw.rating}`} hint={`${chw.reviewCount} verified reviews`} tone="amber" />
        <StatCard label="Completed visits" value={chw.completedVisits} hint="Verified" tone="green" />
        <StatCard label="Reliability" value={`${chw.reliabilityScore}%`} hint="Excellent" tone="blue" />
      </div>
      {ratings.length === 0 ? (
        <Card><EmptyState title="No ratings in this demo period yet" /></Card>
      ) : (
        <div className="space-y-3">
          {ratings.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={16} className={i < r.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
                    ))}
                  </div>
                  <p className="text-sm text-slate-700">“{r.comment}”</p>
                  <p className="text-xs text-slate-400 mt-1">{patients.find((p) => p.id === r.patientId)?.name} · {fmtDate(r.createdAt)}</p>
                </div>
                <Badge tone="green">Verified visit</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
