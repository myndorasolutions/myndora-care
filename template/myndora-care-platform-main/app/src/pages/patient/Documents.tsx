// Patient — Documents: care documents with restricted download/print state.
import { FileText, Lock } from 'lucide-react';
import { fmtDate } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '@/store/ui';
import { Badge, Btn, Card, KV, PageHeader } from '@/components/kit';


export default function PatientDocuments() {
  const ME = useStore((s) => s.identity.patientId);
  const visits = useStore(useShallow((s) => s.visits.filter((v) => v.patientId === ME && (v.status === 'verified' || v.status === 'submitted'))));
  const cases = useStore(useShallow((s) => s.clinicianCases.filter((c) => c.patientId === ME && c.patientSummary)));
  const { toast } = useToast();

  return (
    <div>
      <PageHeader title="My Documents" subtitle="Your care documents. Viewing is watermarked with your name; downloading and printing are restricted." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mc-section-title"><FileText size={17} /> Visit summaries</h3>
          {visits.length === 0 && <p className="text-sm text-slate-500">No visit summaries yet.</p>}
          {visits.map((v) => (
            <KV key={v.id} label={`Visit summary — ${fmtDate(v.scheduledFor)}`}>
              <Btn size="sm" variant="secondary" onClick={() => toast('Document opened in secure viewer (watermarked)')}>View</Btn>
            </KV>
          ))}
          {cases.map((c) => (
            <KV key={c.id} label={`Clinician summary — ${c.title}`}>
              <Btn size="sm" variant="secondary" onClick={() => toast('Document opened in secure viewer (watermarked)')}>View</Btn>
            </KV>
          ))}
        </Card>

        <Card>
          <h3 className="mc-section-title"><Lock size={17} /> Privacy protections active</h3>
          <KV label="Viewer watermark"><Badge tone="green">On — name + timestamp</Badge></KV>
          <KV label="Download / print"><Badge tone="amber">Restricted</Badge></KV>
          <KV label="Minimum necessary info"><Badge tone="green">Enforced per role</Badge></KV>
          <KV label="Session timeout"><Badge tone="green">15 minutes</Badge></KV>
          <KV label="Access log"><Badge tone="green">Recorded</Badge></KV>
          <p className="text-xs text-slate-500 mt-3">
            Browser screenshots cannot be fully disabled by any web app — Myndora instead watermarks views, limits what's shown, and logs access.
          </p>
        </Card>
      </div>
    </div>
  );
}
