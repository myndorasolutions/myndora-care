// Admin — Operations dashboard (purple theme).
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Btn, Card, KV, StatCard } from '@/components/kit';

export default function AdminOperations() {
  const navigate = useNavigate();
  const chws = useStore((s) => s.chws);
  const complaints = useStore((s) => s.complaints);
  const serviceRequests = useStore((s) => s.serviceRequests);
  const dqFlags = useStore((s) => s.dqFlags);
  const alerts = useStore((s) => s.alerts);
  const consents = useStore((s) => s.consents);
  const auditEvents = useStore((s) => s.auditEvents);

  const pendingCHWs = chws.filter((c) => c.status === 'pending').length;
  const pendingRequests = serviceRequests.filter((r) => r.status === 'pending').length;
  const openComplaints = complaints.filter((c) => c.stage !== 'resolved');
  const safetyComplaints = openComplaints.filter((c) => c.severity === 'safety');
  const openFlags = dqFlags.filter((f) => f.status === 'open').length;
  const openAlerts = alerts.filter((a) => a.status !== 'resolved').length;
  const unusualAccess = auditEvents.filter((e) => e.flaggedUnusual).length;
  const pendingConsents = consents.filter((c) => c.status === 'pending').length;

  return (
    <div>
      <section className="mc-hero mb-5">
        <h1 className="text-2xl font-extrabold">Operations & Trust Center</h1>
        <p className="text-sm text-purple-100 mt-1 mb-5">Prioritize exceptions requiring human review. AI flags anomalies — people make the decisions.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Pending approvals" value={pendingRequests + pendingCHWs} hint={`${pendingCHWs} CHW, ${pendingRequests} requests`} tone="amber" />
          <StatCard label="Open complaints" value={openComplaints.length} hint={safetyComplaints.length ? `${safetyComplaints.length} safety` : 'None safety'} tone={safetyComplaints.length ? 'red' : 'green'} />
          <StatCard label="Data quality flags" value={openFlags} hint="Investigate" tone="purple" />
          <StatCard label="Unusual access attempts" value={unusualAccess} hint={unusualAccess ? 'Review' : 'None'} tone={unusualAccess ? 'red' : 'green'} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h3 className="mc-section-title">Approval queue</h3>
          <KV label="CHW verification">{pendingCHWs} pending</KV>
          <KV label="Service / rate requests">{pendingRequests} pending</KV>
          <div className="flex gap-2 mt-3">
            <Btn size="sm" onClick={() => navigate('/admin/approvals')}>Review requests</Btn>
            <Btn size="sm" variant="secondary" onClick={() => navigate('/admin/chws')}>CHW verification</Btn>
          </div>
        </Card>
        <Card>
          <h3 className="mc-section-title">Safety & complaints</h3>
          <KV label="Safety complaints">{safetyComplaints.length} open</KV>
          <KV label="Other complaints">{openComplaints.length - safetyComplaints.length} open</KV>
          <KV label="Escalated alerts">{openAlerts} open</KV>
          <div className="flex gap-2 mt-3">
            <Btn size="sm" variant="danger" onClick={() => navigate('/admin/complaints')}>Complaint queue</Btn>
            <Btn size="sm" variant="secondary" onClick={() => navigate('/admin/alerts')}>Alert queue</Btn>
          </div>
        </Card>
        <Card>
          <h3 className="mc-section-title">Consent & data quality</h3>
          <KV label="Pending consent requests">{pendingConsents}</KV>
          <KV label="Unusual access attempts">{unusualAccess}</KV>
          <KV label="Open data-quality flags">{openFlags}</KV>
          <div className="flex gap-2 mt-3">
            <Btn size="sm" variant="secondary" onClick={() => navigate('/admin/consent')}>Consent & access</Btn>
            <Btn size="sm" variant="secondary" onClick={() => navigate('/admin/quality')}>Data quality</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}
