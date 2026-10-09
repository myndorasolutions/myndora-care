import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, Stethoscope } from 'lucide-react';
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  Field,
  KV,
  PageHeader,
  Textarea,
} from '@/components/kit';
import { ApiError } from '@/lib/api';
import { useClinicianReviewQueue } from '@/lib/clinicianQueries';
import { severityDisplayLabel, type ReviewStatus } from '@/lib/reviewQueue';
import { vitalsApi } from '@/lib/vitalsApi';

export function ClinicianCaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const queueQuery = useClinicianReviewQueue();
  const kase = (queueQuery.data ?? []).find((c) => c.id === id);

  const [notes, setNotes] = useState('');
  const notesReady = notes || kase?.clinicianNotes || '';

  const mutation = useMutation({
    mutationFn: (status: ReviewStatus) =>
      vitalsApi.updateReview(id!, {
        status,
        clinician_notes: notes || kase?.clinicianNotes || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'review-queue'] });
      navigate('/clinician/review');
    },
  });

  if (queueQuery.isLoading) {
    return (
      <div>
        <PageHeader title="Loading case…" />
        <Card>
          <p className="text-sm text-slate-500">Fetching review queue…</p>
        </Card>
      </div>
    );
  }

  if (!kase) {
    return (
      <div>
        <PageHeader title="Case not found" />
        <Card>
          <EmptyState
            title="This case is not in the open queue"
            hint="It may already be closed, or the id is invalid."
            action={
              <Btn variant="secondary" onClick={() => navigate('/clinician/review')}>
                Back to queue
              </Btn>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={kase.triggerReason ?? 'Flagged vitals review'}
        subtitle={`${kase.patientName} · routed ${new Date(kase.createdAt).toLocaleString()}`}
        actions={
          <Btn variant="secondary" onClick={() => navigate('/clinician/review')}>
            Back to queue
          </Btn>
        }
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mc-section-title">
            <Activity size={16} /> Measured readings
          </h3>
          <KV label="Severity">
            <Badge tone={kase.severity === 'URGENT' ? 'red' : 'amber'}>
              {severityDisplayLabel(kase.severity)}
            </Badge>
          </KV>
          <KV label="Blood pressure">
            {kase.systolic}/{kase.diastolic} mmHg
          </KV>
          {kase.pulse != null && <KV label="Pulse">{kase.pulse} bpm</KV>}
          {kase.temperatureCelsius != null && (
            <KV label="Temperature">{kase.temperatureCelsius} °C</KV>
          )}
          {kase.bloodSugarMgDl != null && (
            <KV label="Blood sugar">{kase.bloodSugarMgDl} mg/dL</KV>
          )}
          <KV label="Status">{kase.status.replace(/_/g, ' ')}</KV>
        </Card>

        <Card>
          <h3 className="mc-section-title">
            <Stethoscope size={16} /> Clinical action
          </h3>
          <Field label="Clinician notes">
            <Textarea
              value={notes || kase.clinicianNotes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Document review findings…"
            />
          </Field>
          {mutation.isError && (
            <p className="mt-2 text-sm text-red-600">
              {mutation.error instanceof ApiError
                ? mutation.error.message
                : 'Update failed'}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn
              disabled={mutation.isPending || kase.status === 'closed'}
              onClick={() => mutation.mutate('reviewed')}
            >
              Mark reviewed
            </Btn>
            <Btn
              variant="danger"
              disabled={mutation.isPending || kase.status === 'closed'}
              onClick={() => mutation.mutate('closed')}
            >
              Close case
            </Btn>
          </div>
          {!notesReady && kase.status === 'needs_review' && (
            <p className="mt-2 text-xs text-slate-500">
              Notes are optional but recommended before closing.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
