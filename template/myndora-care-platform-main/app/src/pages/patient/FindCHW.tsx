// Patient — Find a CHW: recommendation engine with reasons, reject/block/select.
import { useState } from 'react';
import { Ban, ThumbsDown } from 'lucide-react';
import type { ServiceType } from '@/types';
import { rankCHWs } from '@/lib/recommend';
import { useStore } from '@/store/useStore';
import { useModal, useToast } from '@/store/ui';
import { Btn, Card, Field, PageHeader, Select } from '@/components/kit';
import CHWCard from '@/components/CHWCard';


export default function PatientFindCHW() {
  const ME = useStore((s) => s.identity.patientId);
  const patient = useStore((s) => s.patients.find((p) => p.id === ME))!;
  const chws = useStore((s) => s.chws);
  const blocked = useStore((s) => s.blockedChws[ME] ?? []);
  const selectedId = useStore((s) => s.selectedChwByPatient[ME]);
  const selectChw = useStore((s) => s.selectChw);
  const rejectChw = useStore((s) => s.rejectChw);
  const blockChw = useStore((s) => s.blockChw);
  const { openModal, closeModal } = useModal();
  const { toast } = useToast();
  const [service, setService] = useState<ServiceType>('home_visit');

  const ranked = rankCHWs(chws, patient, service, blocked);

  const confirmBlock = (chwId: string, name: string) => {
    openModal({
      title: `Block ${name}?`,
      body: <p className="text-sm text-slate-600">Blocked CHWs are excluded from all future recommendations and assignments for you. You can ask support to undo this later.</p>,
      footer: (
        <>
          <Btn variant="secondary" onClick={closeModal}>Cancel</Btn>
          <Btn variant="danger" onClick={() => { blockChw(ME, chwId); closeModal(); toast(`${name} blocked from future assignments`); }}>Block CHW</Btn>
        </>
      ),
    });
  };

  return (
    <div>
      <PageHeader
        title="Find a Community Health Worker"
        subtitle="Recommendations weigh qualification, service scope, location, travel time, language, preferences, condition training, ratings, reliability and workload — never distance alone."
        actions={
          <Field label="Needed service">
            <Select value={service} onChange={(e) => setService(e.target.value as ServiceType)} aria-label="Needed service">
              <option value="home_visit">Home visit</option>
              <option value="remote_check">Remote check</option>
              <option value="wellbeing_call">Wellbeing call</option>
              <option value="lab_collection">Lab collection</option>
            </Select>
          </Field>
        }
      />

      {blocked.length > 0 && (
        <p className="text-xs text-slate-500 mb-4">
          You have blocked {blocked.length} CHW{blocked.length > 1 ? 's' : ''} — they are hidden from recommendations.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {ranked.map(({ chw, reasons, concerns }, i) => (
          <CHWCard
            key={chw.id}
            chw={chw}
            selected={chw.id === selectedId}
            reasons={i === 0 ? [...reasons, 'Best overall match for your needs'] : reasons}
            concerns={concerns}
            actions={
              <>
                {chw.id !== selectedId ? (
                  <Btn size="sm" onClick={() => { selectChw(ME, chw.id); toast(`${chw.name} selected as your CHW`); }}>
                    Choose {chw.name.split(' ')[0]}
                  </Btn>
                ) : (
                  <Btn size="sm" variant="secondary" disabled>Your CHW</Btn>
                )}
                <Btn size="sm" variant="ghost" onClick={() => { rejectChw(ME, chw.id); toast(`${chw.name} rejected — won't be offered for this need`); }}>
                  <ThumbsDown size={14} /> Not this CHW
                </Btn>
                <Btn size="sm" variant="danger-soft" onClick={() => confirmBlock(chw.id, chw.name)}>
                  <Ban size={14} /> Block
                </Btn>
                <Btn size="sm" variant="secondary" onClick={() => openModal({
                  title: `${chw.name} — verified profile`,
                  body: (
                    <div className="text-sm text-slate-600 space-y-2">
                      <p><b>{chw.cadre}</b> · {chw.yearsExperience} years experience · {chw.completedVisits} verified visits</p>
                      <p>Languages: {chw.languages.join(', ')}</p>
                      <p>Service area: {chw.serviceArea} · approx. {chw.distanceKm} km · ~{chw.etaMinutes} min</p>
                      <p>Approved services: {chw.approvedServices.map((s) => s.replace('_', ' ')).join(', ')}</p>
                      <p>Condition training: {chw.conditionTraining.join(', ') || '—'}</p>
                      <p className="text-xs text-slate-500">Identity documents, NIN and references are reviewed by Myndora administrators and never shown to patients.</p>
                    </div>
                  ),
                  footer: <Btn variant="secondary" onClick={closeModal}>Close</Btn>,
                })}>View profile</Btn>
              </>
            }
          />
        ))}
      </div>
      {ranked.length === 0 && (
        <Card><p className="text-sm text-slate-600">No CHWs currently match in {patient.city} for this service. Try another service type or contact support.</p></Card>
      )}
    </div>
  );
}
