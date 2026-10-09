import { useState } from 'react';
import { Badge, Btn, Card, EmptyState, Field, PageHeader, Textarea, type BadgeTone } from '@/components/kit';
import { useAuthStore } from '@/stores/authStore';

type ComplaintStage = 'submitted' | 'acknowledged' | 'resolved';

interface DraftComplaint {
  id: string;
  type: string;
  details: string;
  stage: ComplaintStage;
  raisedByName: string;
  createdAt: string;
}

const STAGE_LABELS: Record<ComplaintStage, string> = {
  submitted: 'Submitted',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
};

function stageTone(stage: ComplaintStage): BadgeTone {
  if (stage === 'resolved') return 'green';
  return 'amber';
}

const TYPES = [
  'Request a different CHW',
  'Incomplete service',
  'Safety concern',
  'Privacy concern',
  'Other',
];

export function ComplaintsPage() {
  const user = useAuthStore((s) => s.user);
  const [complaints, setComplaints] = useState<DraftComplaint[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [type, setType] = useState(TYPES[0]);
  const [details, setDetails] = useState('');

  const submit = () => {
    if (!details.trim()) return;
    const next: DraftComplaint = {
      id: `c-${Date.now()}`,
      type,
      details: details.trim(),
      stage: 'submitted',
      raisedByName: user?.full_name ?? 'You',
      createdAt: new Date().toISOString(),
    };
    setComplaints((prev) => [next, ...prev]);
    setDetails('');
    setFormOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Complaints & Service Recovery"
        subtitle="Request a different CHW, report incomplete service, or raise a safety or privacy concern. Drafts stay on this device until recovery workflows are connected."
        actions={
          <Btn size="sm" onClick={() => setFormOpen((o) => !o)}>
            {formOpen ? 'Cancel' : 'New complaint'}
          </Btn>
        }
      />

      {formOpen && (
        <Card className="mb-4 space-y-3">
          <Field label="Type">
            <select
              className="mc-input"
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Complaint type"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Details">
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              aria-label="Complaint details"
              placeholder="Describe what happened…"
            />
          </Field>
          <Btn size="sm" disabled={!details.trim()} onClick={submit}>
            Submit draft
          </Btn>
        </Card>
      )}

      {complaints.length === 0 && !formOpen ? (
        <Card>
          <EmptyState
            title="No complaints yet"
            hint="Complaints you submit will appear here with their recovery stage."
            action={
              <Btn size="sm" onClick={() => setFormOpen(true)}>
                New complaint
              </Btn>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {complaints.map((c) => (
            <Card key={c.id}>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900">{c.type}</h3>
                  <p className="text-xs text-slate-500">
                    Raised by {c.raisedByName} ·{' '}
                    {new Date(c.createdAt).toLocaleString('en-NG', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <Badge tone={stageTone(c.stage)}>{STAGE_LABELS[c.stage]}</Badge>
              </div>
              <p className="text-sm text-slate-600">{c.details}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
