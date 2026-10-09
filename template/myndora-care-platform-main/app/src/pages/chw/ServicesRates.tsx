// CHW — Services & Rates: approved catalogue + request changes (admin approves).
// CHWs cannot publish arbitrary services or prices.
import { useState } from 'react';
import type { RequestKind } from '@/types';
import { fmtDateTime } from '@/lib/format';
import { formatNaira, findRateCard } from '@/lib/pricing';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useModal, useToast } from '@/store/ui';
import { Badge, Btn, Card, Field, KV, PageHeader, Select, Textarea, type BadgeTone } from '@/components/kit';

const KIND_LABELS: Record<RequestKind, string> = {
  new_service: 'New service', rate_change: 'Rate change', radius_change: 'Radius change', add_on: 'Add-on',
};
const TONE: Record<string, BadgeTone> = { pending: 'amber', approved: 'green', rejected: 'red' };

function ServiceRequestForm({ onDone }: { onDone: () => void }) {
  const ME = useStore((s) => s.identity.chwId);
  const requestServiceChange = useStore((s) => s.requestServiceChange);
  const { toast } = useToast();
  const [kind, setKind] = useState<RequestKind>('new_service');
  const [description, setDescription] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        requestServiceChange(ME, kind, description);
        toast('Request submitted for admin approval');
        onDone();
      }}
    >
      <p className="text-sm text-slate-600">You cannot publish services or prices yourself. An administrator reviews every request before it takes effect.</p>
      <Field label="Request type">
        <Select value={kind} onChange={(e) => setKind(e.target.value as RequestKind)} aria-label="Request type">
          {(Object.keys(KIND_LABELS) as RequestKind[]).map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
        </Select>
      </Field>
      <Field label="Description">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Request description" placeholder="Describe the service, rate, radius or add-on you are requesting…" />
      </Field>
      <div className="flex justify-end gap-2">
        <Btn type="submit" disabled={!description.trim()}>Submit request</Btn>
      </div>
    </form>
  );
}

export default function ChwServicesRates() {
  const ME = useStore((s) => s.identity.chwId);
  const chw = useStore((s) => s.chws.find((c) => c.id === ME))!;
  const rateCards = useStore((s) => s.rateCards);
  const requests = useStore(useShallow((s) => s.serviceRequests.filter((r) => r.chwId === ME)));
  const { openModal, closeModal } = useModal();

  const homeCard = findRateCard(rateCards, chw.city, 'home_visit');
  const remoteCard = findRateCard(rateCards, chw.city, 'remote_check');

  const openRequest = () => {
    openModal({
      title: 'Request a change (goes to admin approval)',
      backdropDismiss: false,
      body: <ServiceRequestForm onDone={closeModal} />,
    });
  };

  return (
    <div>
      <PageHeader title="Services & Rates" subtitle="Your approved service catalogue and the city rate card that prices your work." actions={<Btn onClick={openRequest}>Request a change</Btn>} />

      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <Card>
          <h3 className="mc-section-title">My approved services</h3>
          {chw.approvedServices.map((s) => (
            <KV key={s} label={s.replace('_', ' ')}><Badge tone="green">Approved</Badge></KV>
          ))}
          <KV label="Base service radius">{chw.baseRadiusKm} km around {chw.serviceArea}</KV>
        </Card>
        <Card>
          <h3 className="mc-section-title">{chw.city} rate card (approved)</h3>
          {homeCard && <KV label="Home visit base">{formatNaira(homeCard.baseCharge)} within {homeCard.baseRadiusKm} km</KV>}
          {remoteCard && <KV label="Remote check base">{formatNaira(remoteCard.baseCharge)}</KV>}
          {homeCard && (
            <>
              <KV label="Distance bands">{homeCard.distanceBands.filter((b) => b.upToKm < 999).map((b) => `≤${b.upToKm} km +${formatNaira(b.addFee)}`).join(' · ')}</KV>
              <KV label="Weekend / evening">+{homeCard.weekendAdjustmentPct}% / +{homeCard.eveningAdjustmentPct}%</KV>
              <KV label="Same-day">+{homeCard.sameDayAdjustmentPct}% capped at {formatNaira(homeCard.sameDayCap)}</KV>
              <KV label="Platform coordination fee">{homeCard.platformFeePct}%</KV>
            </>
          )}
          <p className="text-xs text-slate-500 mt-2">No surge pricing. Rates never depend on a sponsor's wealth or a patient's medical severity.</p>
        </Card>
      </div>

      <h2 className="mc-section-title">My requests</h2>
      <div className="space-y-3">
        {requests.length === 0 && <Card><p className="text-sm text-slate-500">No requests submitted yet.</p></Card>}
        {requests.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold text-sm text-slate-900">{KIND_LABELS[r.kind]}</p>
                <p className="text-sm text-slate-600">{r.description}</p>
                <p className="text-xs text-slate-400 mt-0.5">{fmtDateTime(r.createdAt)}</p>
              </div>
              <Badge tone={TONE[r.status]}>{r.status}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
