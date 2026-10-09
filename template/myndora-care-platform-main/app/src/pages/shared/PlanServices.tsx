// Plan & Services — shared by sponsor and patient portals (role-aware copy).
import { Check, GitCompareArrows, MapPin } from 'lucide-react';
import type { AddOnType, PackageTier, Role } from '@/types';
import { PACKAGES, packageDef, tierRank, featureUnlocked } from '@/lib/permissions';
import { ADDON_LABELS } from '@/lib/format';
import { useStore, useSelectedPatient } from '@/store/useStore';
import { useModal, useToast } from '@/store/ui';
import { Badge, Btn, Card, Field, PageHeader, Select } from '@/components/kit';
import { useLocationModal } from '@/components/modals';

const ADDONS: { id: AddOnType; description: string; premiumOnly?: boolean }[] = [
  { id: 'physical_visit', description: "Optional in-person CHW visits, subject to availability in the patient's city." },
  { id: 'lab_collection', description: 'Home lab sample collection where partner labs operate.' },
  { id: 'medicine_delivery', description: 'Prescription delivery via verified partner pharmacies.' },
  { id: 'clinician_review', description: 'Routing of flagged results to a reviewing clinician.', premiumOnly: true },
];

function CompareModalBody({ currentTier }: { currentTier: PackageTier }) {
  const allFeatures = Array.from(new Set(PACKAGES.flatMap((p) => p.features.filter((f) => !f.startsWith('All ')))));
  return (
    <div className="overflow-x-auto">
      <table className="mc-table w-full min-w-[560px]">
        <thead>
          <tr>
            <th>Feature</th>
            {PACKAGES.map((p) => (
              <th key={p.id}>
                {p.name} {p.id === currentTier && <Badge tone="blue">Current</Badge>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allFeatures.map((f) => (
            <tr key={f}>
              <td className="font-medium">{f}</td>
              {PACKAGES.map((p) => {
                const included = PACKAGES.filter((x) => x.rank <= p.rank).some((x) => x.features.includes(f));
                return (
                  <td key={p.id} aria-label={`${p.name}: ${included ? 'included' : 'not included'}`}>
                    {included ? <Check size={16} className="text-emerald-600" /> : <span className="text-slate-300">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-500 mt-3">Prices vary by city and are confirmed through the city rate card before any change takes effect.</p>
    </div>
  );
}

export default function PlanServicesPage({ role }: { role: Extract<Role, 'sponsor' | 'patient'> }) {
  const patient = useSelectedPatient();
  const sub = useStore((s) => s.subscriptions.find((x) => x.patientId === s.selectedPatientId))!;
  const changeTier = useStore((s) => s.changeTier);
  const cancelScheduledDowngrade = useStore((s) => s.cancelScheduledDowngrade);
  const pausePlan = useStore((s) => s.pausePlan);
  const resumePlan = useStore((s) => s.resumePlan);
  const cancelPlan = useStore((s) => s.cancelPlan);
  const toggleAddOn = useStore((s) => s.toggleAddOn);
  const { openModal, closeModal } = useModal();
  const { toast } = useToast();
  const openLocation = useLocationModal();

  const openManage = () => {
    openModal({
      title: `Manage ${packageDef(sub.tier).name}`,
      body: (
        <div className="space-y-3 text-sm text-slate-600">
          <p>This is the current plan for <b>{patient.name}</b>.</p>
          <p>Status: <b className="capitalize">{sub.status.replace('_', ' ')}</b> · Next billing date: <b>{sub.nextBillingDate}</b></p>
          {sub.status === 'active' && (
            <div className="flex flex-wrap gap-2">
              <Btn variant="secondary" size="sm" onClick={() => { pausePlan(patient.id); closeModal(); toast('Plan paused'); }}>Pause plan</Btn>
              <Btn variant="danger-soft" size="sm" onClick={() => {
                openModal({
                  title: 'Cancel this plan?',
                  body: <p className="text-sm text-slate-600">Cancellation takes effect at the end of the current billing cycle. Care records remain available to the patient.</p>,
                  footer: (
                    <>
                      <Btn variant="secondary" onClick={openManage}>Keep plan</Btn>
                      <Btn variant="danger" onClick={() => { cancelPlan(patient.id); closeModal(); toast('Plan cancellation scheduled'); }}>Confirm cancellation</Btn>
                    </>
                  ),
                });
              }}>Cancel plan</Btn>
            </div>
          )}
          {sub.status === 'paused' && (
            <Btn size="sm" onClick={() => { resumePlan(patient.id); closeModal(); toast('Plan resumed'); }}>Resume plan</Btn>
          )}
          {sub.status === 'pending_cancellation' && (
            <Btn size="sm" onClick={() => { resumePlan(patient.id); closeModal(); toast('Cancellation reversed — plan active'); }}>Reverse cancellation</Btn>
          )}
        </div>
      ),
      footer: <Btn variant="secondary" onClick={closeModal}>Close</Btn>,
    });
  };

  const handleSelect = (tier: PackageTier) => {
    if (tier === sub.tier) {
      openManage();
      return;
    }
    const isUpgrade = tierRank(tier) > tierRank(sub.tier);
    openModal({
      title: isUpgrade ? 'Confirm availability & upgrade' : 'Schedule downgrade',
      backdropDismiss: false,
      body: (
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Change <b>{patient.name}</b> from <b>{packageDef(sub.tier).name}</b> to <b>{packageDef(tier).name}</b>?
          </p>
          {isUpgrade ? (
            <>
              <Field label="Service availability in patient's city">
                <Select aria-label="Availability check" defaultValue="available">
                  <option value="available">Available in {patient.city} — CHW capacity confirmed</option>
                  <option value="limited">Limited — remote services only for now</option>
                </Select>
              </Field>
              <p className="text-xs text-slate-500">Upgrades take effect immediately after availability is confirmed. The price is confirmed from the {patient.city} rate card before billing.</p>
            </>
          ) : (
            <p className="text-xs text-slate-500">
              Downgrades are scheduled for the <b>next billing cycle ({sub.nextBillingDate})</b>. The current plan stays active until then.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="secondary" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={() => {
              const result = changeTier(patient.id, tier);
              closeModal();
              toast(result === 'upgraded' ? `Upgraded to ${packageDef(tier).name}` : `Downgrade scheduled for ${sub.nextBillingDate}`);
            }}>{isUpgrade ? 'Confirm upgrade' : 'Schedule downgrade'}</Btn>
          </div>
        </div>
      ),
    });
  };

  return (
    <div>
      <PageHeader
        title="Plan & Services"
        subtitle={
          role === 'sponsor'
            ? `You manage payment for ${patient.name}. The patient independently controls health-information access.`
            : 'Compare packages and manage the services available in your care location.'
        }
        actions={
          <>
            <Btn variant="secondary" onClick={() => openLocation(patient.id)}><MapPin size={15} /> Change location ({patient.city})</Btn>
            <Btn variant="secondary" onClick={() => openModal({ title: 'Compare packages', size: 'lg', body: <CompareModalBody currentTier={sub.tier} />, footer: <Btn variant="secondary" onClick={closeModal}>Close</Btn> })}>
              <GitCompareArrows size={15} /> Compare packages
            </Btn>
          </>
        }
      />

      {sub.scheduledDowngradeTo && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>Downgrade to <b>{packageDef(sub.scheduledDowngradeTo).name}</b> scheduled for <b>{sub.nextBillingDate}</b>.</span>
          <Btn size="sm" variant="secondary" onClick={() => { cancelScheduledDowngrade(patient.id); toast('Scheduled downgrade cancelled'); }}>Cancel scheduled downgrade</Btn>
        </div>
      )}
      {sub.status !== 'active' && (
        <div className="mb-4 rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-sm">
          Plan status: <b className="capitalize">{sub.status.replace('_', ' ')}</b>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PACKAGES.map((p) => {
          const current = p.id === sub.tier;
          const scheduled = p.id === sub.scheduledDowngradeTo;
          return (
            <Card key={p.id} className={current ? 'ring-2 ring-[var(--accent)]/30 border-[var(--accent)]' : ''}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-slate-900">{p.name}</h3>
                {current && <Badge tone="blue">Current plan</Badge>}
                {scheduled && <Badge tone="amber">Starts next cycle</Badge>}
              </div>
              <p className="text-xs text-slate-500 mt-1 mb-3">{p.tagline}</p>
              <ul className="text-xs text-slate-600 space-y-1.5 mb-4 min-h-[120px]">
                {p.features.slice(0, 5).map((f) => (
                  <li key={f} className="flex gap-1.5"><Check size={13} className="text-emerald-600 shrink-0 mt-0.5" />{f}</li>
                ))}
              </ul>
              <Btn
                variant={current ? 'secondary' : 'primary'}
                size="sm"
                className="w-full"
                onClick={() => handleSelect(p.id)}
              >
                {current ? 'Manage plan' : tierRank(p.id) > tierRank(sub.tier) ? 'Upgrade' : 'Select (downgrade)'}
              </Btn>
            </Card>
          );
        })}
      </div>

      <h2 className="mc-section-title mt-8">Add-on services available in {patient.city}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ADDONS.map((a) => {
          const active = sub.addOns.includes(a.id);
          const locked = a.premiumOnly && !featureUnlocked(sub.tier, 'clinician_review');
          return (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-slate-900 text-sm">{ADDON_LABELS[a.id]}</h3>
                {active && <Badge tone="green">Active</Badge>}
              </div>
              <p className="text-xs text-slate-500 mt-1 mb-3">{a.description}</p>
              {locked ? (
                <p className="text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg p-2">Requires the <b>Premium Family Care</b> package.</p>
              ) : (
                <Btn size="sm" variant={active ? 'danger-soft' : 'secondary'} className="w-full" onClick={() => {
                  toggleAddOn(patient.id, a.id);
                  toast(active ? `${ADDON_LABELS[a.id]} removed` : `${ADDON_LABELS[a.id]} added — priced from ${patient.city} rate card`);
                }}>
                  {active ? 'Remove add-on' : 'Add service'}
                </Btn>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
