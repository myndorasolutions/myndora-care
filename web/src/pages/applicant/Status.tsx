import { useNavigate } from 'react-router-dom';
import { useApplication } from './ApplicantLayout';
import { Badge, Btn, Card, PageHeader } from '@/components/kit';

const PIPELINE = [
  { id: 'identity', label: 'Identity & documents', to: '/applicant/identity' },
  { id: 'qualifications', label: 'Qualifications', to: '/applicant/qualifications' },
  { id: 'references', label: 'References', to: '/applicant/references' },
  { id: 'training', label: 'Training', to: '/applicant/training' },
  { id: 'review', label: 'Staff review', to: '/applicant/status' },
  { id: 'approved', label: 'Approved', to: '/applicant/status' },
] as const;

export function ApplicantStatusPage() {
  const navigate = useNavigate();
  const { status, applicantName, city, identity } = useApplication();

  const currentIndex =
    status === 'APPROVED' ? 5 : status === 'UNDER_REVIEW' ? 4 : 0;

  const outstanding =
    status === 'DRAFT'
      ? [
          { text: 'Complete identity details', to: '/applicant/identity' },
          { text: 'Add qualifications', to: '/applicant/qualifications' },
          { text: 'Provide two references', to: '/applicant/references' },
          { text: 'Study training modules and submit', to: '/applicant/training' },
        ]
      : status === 'UNDER_REVIEW'
        ? [{ text: 'Nothing needed from you right now — our team is reviewing your application', to: '' }]
        : [];

  return (
    <div>
      <PageHeader
        title="Application Status"
        subtitle="Track every verification stage. Outstanding actions appear here whenever something is needed from you."
      />
      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-base font-extrabold text-slate-900">
            {applicantName || identity.legalName || 'Applicant'}
            {city ? ` · ${city}` : ''}
          </p>
          <Badge
            tone={status === 'APPROVED' ? 'green' : status === 'UNDER_REVIEW' ? 'blue' : 'amber'}
          >
            {status === 'APPROVED' ? 'Approved' : status === 'UNDER_REVIEW' ? 'Under review' : 'Draft'}
          </Badge>
        </div>
        <div className="mt-4 space-y-2.5">
          {PIPELINE.map((s, i) => {
            const done = currentIndex > i || status === 'APPROVED';
            const current = currentIndex === i && status !== 'APPROVED';
            return (
              <div key={s.id} className="flex items-center gap-3">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${done ? 'bg-emerald-500 text-white' : current ? 'text-white' : 'bg-slate-200 text-slate-500'}`}
                  style={current ? { background: 'var(--accent, var(--blue))' } : undefined}
                >
                  {done ? '✓' : i + 1}
                </span>
                <p
                  className={`text-sm ${current ? 'font-extrabold text-slate-900' : done ? 'font-semibold text-slate-700' : 'text-slate-400'}`}
                >
                  {s.label}
                  {current && (
                    <span className="ml-2">
                      <Badge tone="amber">current</Badge>
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
          Outstanding actions
        </p>
        {status === 'APPROVED' ? (
          <p className="text-sm text-slate-600">
            None — you are fully approved. Open the CHW workbench from Today when you sign in as a
            CHW.
          </p>
        ) : (
          <div className="space-y-2">
            {outstanding.map((a) => (
              <div
                key={a.text}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5"
              >
                <p className="text-sm text-slate-700">{a.text}</p>
                {a.to ? (
                  <Btn size="sm" variant="secondary" onClick={() => navigate(a.to)}>
                    Open
                  </Btn>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
