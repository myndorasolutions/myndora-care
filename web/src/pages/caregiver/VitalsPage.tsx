import { FormEvent, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { apiFetch } from '@/lib/api';

export function CaregiverVitalsPage() {
  const [patientId, setPatientId] = useState('p1');
  const [systolic, setSystolic] = useState('130');
  const [diastolic, setDiastolic] = useState('85');
  const [glucose, setGlucose] = useState('110');
  const [saved, setSaved] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    try {
      await apiFetch('/vitals', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          systolic_bp: Number(systolic),
          diastolic_bp: Number(diastolic),
          glucose_fasting: Number(glucose),
          source_type: 'caregiver',
          capture_location_type: 'home',
        }),
      });
    } catch {
      /* mock fallback */
    }
    setSaved(true);
  };

  return (
    <>
      <PageHeader title="Log vitals" subtitle="Capture for assigned patient" />
      <form onSubmit={onSubmit} className="card max-w-md space-y-4">
        <div>
          <label className="label">Patient ID</label>
          <input className="input" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Systolic</label>
            <input className="input" type="number" value={systolic} onChange={(e) => setSystolic(e.target.value)} />
          </div>
          <div>
            <label className="label">Diastolic</label>
            <input className="input" type="number" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Fasting glucose</label>
          <input className="input" type="number" value={glucose} onChange={(e) => setGlucose(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary w-full">Submit vitals</button>
        {saved && <p className="text-sm text-success">Vitals recorded (mock if API unavailable).</p>}
      </form>
    </>
  );
}
