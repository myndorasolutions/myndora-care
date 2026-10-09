// Sponsor — Care Team: review assigned CHW, choose another from recommendations.
import { useNavigate } from 'react-router-dom';
import { rankCHWs } from '@/lib/recommend';
import { useStore, useSelectedPatient } from '@/store/useStore';
import { useToast } from '@/store/ui';
import { Btn, Card, PageHeader, Badge } from '@/components/kit';
import CHWCard from '@/components/CHWCard';

export default function SponsorCareTeam() {
  const navigate = useNavigate();
  const patient = useSelectedPatient();
  const chws = useStore((s) => s.chws);
  const blocked = useStore((s) => s.blockedChws[s.selectedPatientId] ?? []);
  const selectedId = useStore((s) => s.selectedChwByPatient[s.selectedPatientId]);
  const selectChw = useStore((s) => s.selectChw);
  const { toast } = useToast();

  const ranked = rankCHWs(chws, patient, 'home_visit', blocked);
  const assigned = chws.find((c) => c.id === selectedId);

  return (
    <div>
      <PageHeader
        title={`Care Team — ${patient.name}`}
        subtitle="Review the assigned community health worker and compare verified alternatives. The patient can reject or block any CHW."
        actions={<Btn variant="secondary" onClick={() => navigate('/sponsor/complaints')}>Request reassignment</Btn>}
      />

      {assigned ? (
        <Card className="mb-6">
          <h3 className="mc-section-title">Currently assigned</h3>
          <CHWCard chw={assigned} selected />
        </Card>
      ) : (
        <Card className="mb-6"><p className="text-sm text-slate-600">No CHW currently assigned. Choose one from the recommended list below.</p></Card>
      )}

      <h2 className="mc-section-title">Recommended alternatives</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {ranked.filter((r) => r.chw.id !== selectedId).map(({ chw, reasons, concerns }) => (
          <CHWCard
            key={chw.id}
            chw={chw}
            reasons={reasons}
            concerns={concerns}
            actions={
              <Btn size="sm" onClick={() => { selectChw(patient.id, chw.id); toast(`${chw.name} selected — assignment request sent for confirmation`); }}>
                Choose this CHW <Badge tone="blue">request</Badge>
              </Btn>
            }
          />
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-4">
        Patient-visible profiles only. Identity numbers, exact home addresses, certificates and reference documents are restricted to platform administrators.
      </p>
    </div>
  );
}
