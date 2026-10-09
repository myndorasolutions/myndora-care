// Patient — My Care Team: current CHW, preferences, reassignment, blocked list.
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '@/store/ui';
import { Btn, Card, Field, KV, PageHeader, Select } from '@/components/kit';
import CHWCard from '@/components/CHWCard';
import { useComplaintModal } from '@/components/modals';


export default function PatientCareTeam() {
  const ME = useStore((s) => s.identity.patientId);
  const navigate = useNavigate();
  const patient = useStore((s) => s.patients.find((p) => p.id === ME))!;
  const chw = useStore((s) => s.chws.find((c) => c.id === s.selectedChwByPatient[ME]));
  const blockedChws = useStore(useShallow((s) => s.chws.filter((c) => (s.blockedChws[ME] ?? []).includes(c.id))));
  const setPreferences = useStore((s) => s.setPreferences);
  const { toast } = useToast();
  const openComplaint = useComplaintModal();

  return (
    <div>
      <PageHeader
        title="My Care Team"
        subtitle="You choose who provides your care. Reject, block, or request a different CHW at any time."
        actions={<Btn onClick={() => navigate('/patient/find-chw')}>Find another CHW</Btn>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <h3 className="mc-section-title">My current CHW</h3>
            {chw ? (
              <CHWCard
                chw={chw}
                selected
                actions={
                  <Btn size="sm" variant="danger-soft" onClick={() => openComplaint({
                    patientId: ME, chwId: chw.id, raisedByRole: 'patient', raisedByName: patient.name,
                    title: 'Request a different CHW',
                  })}>
                    Request reassignment
                  </Btn>
                }
              />
            ) : (
              <p className="text-sm text-slate-600">No CHW assigned. <button type="button" className="underline font-semibold" onClick={() => navigate('/patient/find-chw')}>Choose one now</button>.</p>
            )}
          </Card>

          <Card>
            <h3 className="mc-section-title">Blocked CHWs</h3>
            {blockedChws.length === 0 ? (
              <p className="text-sm text-slate-500">You haven't blocked anyone. Blocked CHWs never appear in your recommendations or assignments.</p>
            ) : (
              blockedChws.map((c) => <KV key={c.id} label={c.name}><span className="text-xs text-slate-500">Blocked from all future assignments</span></KV>)
            )}
          </Card>
        </div>

        <Card>
          <h3 className="mc-section-title">My matching preferences</h3>
          <div className="space-y-4">
            <Field label="CHW gender preference">
              <Select
                value={patient.genderPreference}
                onChange={(e) => { setPreferences(ME, { genderPreference: e.target.value as 'any' | 'female' | 'male' }); toast('Preference saved'); }}
                aria-label="CHW gender preference"
              >
                <option value="any">No preference</option>
                <option value="female">Female CHW</option>
                <option value="male">Male CHW</option>
              </Select>
            </Field>
            <Field label="Preferred language">
              <Select
                value={patient.languagePreference}
                onChange={(e) => { setPreferences(ME, { languagePreference: e.target.value }); toast('Preference saved'); }}
                aria-label="Preferred language"
              >
                <option>English</option>
                <option>Yoruba</option>
                <option>Hausa</option>
                <option>Igbo</option>
              </Select>
            </Field>
            <p className="text-xs text-slate-500">Preferences feed the recommendation engine together with qualification, training, ratings and reliability — not distance alone.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
