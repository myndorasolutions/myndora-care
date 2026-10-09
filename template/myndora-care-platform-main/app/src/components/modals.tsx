// Shared modal forms used by multiple portals.
import { useState } from 'react';
import type { City, ComplaintType } from '@/types';
import { COMPLAINT_TYPE_LABELS } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useModal, useToast } from '@/store/ui';
import { Btn, Field, Input, Select, Textarea } from '@/components/kit';

const COMPLAINT_TYPES = Object.keys(COMPLAINT_TYPE_LABELS) as ComplaintType[];
const CITIES: City[] = ['Lagos', 'Ilorin', 'Abuja', 'Other'];

function ComplaintForm({ patientId, chwId, raisedByRole, raisedByName, onDone }: {
  patientId: string; chwId?: string; raisedByRole: 'sponsor' | 'patient'; raisedByName: string; onDone: () => void;
}) {
  const submitComplaint = useStore((s) => s.submitComplaint);
  const { toast } = useToast();
  const [type, setType] = useState<ComplaintType>('request_different_chw');
  const [details, setDetails] = useState('');

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submitComplaint({ patientId, chwId, raisedByRole, raisedByName, type, details: details || 'No details provided.' });
        toast(type === 'safety_concern' ? 'Safety complaint submitted — matching suspended pending review' : 'Complaint submitted and acknowledged');
        onDone();
      }}
    >
      <Field label="Issue type">
        <Select value={type} onChange={(e) => setType(e.target.value as ComplaintType)} aria-label="Issue type">
          {COMPLAINT_TYPES.map((t) => <option key={t} value={t}>{COMPLAINT_TYPE_LABELS[t]}</option>)}
        </Select>
      </Field>
      <Field label="Details">
        <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Describe what happened…" aria-label="Complaint details" />
      </Field>
      {type === 'safety_concern' && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
          Safety complaints suspend future direct matching with this CHW until an administrator completes a review.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Btn type="submit" variant="danger">Submit complaint</Btn>
      </div>
    </form>
  );
}

/** Opens the shared complaint / reassignment modal. */
export function useComplaintModal() {
  const { openModal, closeModal } = useModal();
  return (opts: { patientId: string; chwId?: string; raisedByRole: 'sponsor' | 'patient'; raisedByName: string; title?: string }) => {
    openModal({
      title: opts.title ?? 'Report an issue or request reassignment',
      backdropDismiss: false,
      body: <ComplaintForm {...opts} onDone={closeModal} />,
    });
  };
}

function LocationForm({ patientId, onDone }: { patientId: string; onDone: () => void }) {
  const patient = useStore((s) => s.patients.find((p) => p.id === patientId))!;
  const changeCity = useStore((s) => s.changeCity);
  const { toast } = useToast();
  const [city, setCity] = useState<City>(patient.city);
  const [neighbourhood, setNeighbourhood] = useState(patient.neighbourhood);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        changeCity(patientId, city, neighbourhood);
        toast(`Care location updated to ${city}`);
        onDone();
      }}
    >
      <p className="text-xs text-slate-500">Service availability, CHW recommendations and pricing follow the <b>patient's care location</b>, not the sponsor's location.</p>
      <Field label="Patient city">
        <Select value={city} onChange={(e) => setCity(e.target.value as City)} aria-label="Patient city">
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </Field>
      <Field label="Neighbourhood">
        <Input value={neighbourhood} onChange={(e) => setNeighbourhood(e.target.value)} aria-label="Neighbourhood" />
      </Field>
      {city === 'Other' && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          CHW services are limited in this area. Remote monitoring remains available; physical visits require availability confirmation.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Btn type="submit">Save location</Btn>
      </div>
    </form>
  );
}

export function useLocationModal() {
  const { openModal, closeModal } = useModal();
  return (patientId: string) => {
    openModal({
      title: 'Change care location',
      backdropDismiss: false,
      body: <LocationForm patientId={patientId} onDone={closeModal} />,
    });
  };
}
