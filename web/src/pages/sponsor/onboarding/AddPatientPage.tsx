import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { pricingApi } from '@/lib/authApi';
import { patientsApi } from '@/lib/patientsApi';
import { formatZoneLabel } from '@/lib/zoneLabels';

function ageFromDob(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

function splitLines(raw: string): string[] {
  return raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function AddPatientPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('female');
  const [city, setCity] = useState('Ilorin');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [conditions, setConditions] = useState('');
  const [medications, setMedications] = useState('');
  const [kinName, setKinName] = useState('');
  const [kinPhone, setKinPhone] = useState('');
  const [kinAddress, setKinAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zonesQuery = useQuery({
    queryKey: ['pricing', 'zones'],
    queryFn: () => pricingApi.getZones(),
  });

  const cities = zonesQuery.data?.cities ?? [
    { name: 'Ilorin', pricingZone: 'ZONE_B' },
    { name: 'Lagos', pricingZone: 'ZONE_A' },
  ];

  const age = useMemo(() => ageFromDob(dateOfBirth), [dateOfBirth]);
  const selectedCity = cities.find((c) => c.name === city);

  const create = useMutation({
    mutationFn: () =>
      patientsApi.create({
        fullName,
        dateOfBirth,
        gender,
        address,
        phoneNumber,
        city,
        preferredLanguage,
        emergencyContact: {
          name: emergencyName,
          phone: emergencyPhone,
        },
        caregiverDetails: {
          name: kinName,
          phone: kinPhone,
          address: kinAddress,
        },
        conditionTags: splitLines(conditions),
        medications: splitLines(medications),
        consentAcknowledged: consent,
      }),
    onSuccess: async (patient) => {
      await queryClient.invalidateQueries({ queryKey: ['sponsor', 'onboarding'] });
      await queryClient.invalidateQueries({ queryKey: ['sponsor', 'patients'] });
      navigate(`/sponsor/onboarding/checkout?patientId=${patient.id}`, {
        replace: true,
      });
    },
    onError: () => setError('Could not create patient. Check required fields and try again.'),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError('Patient consent acknowledgment is required.');
      return;
    }
    create.mutate();
  };

  return (
    <>
      <PageHeader
        title="Add patient profile"
        subtitle="Complete demographics and consent before subscription checkout"
      />

      <form className="mx-auto max-w-2xl space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm text-slate-600">
          Patient full name
          <input
            className="input mt-1 w-full"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-600">
            Date of birth
            <input
              className="input mt-1 w-full"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-slate-600">
            Age
            <input
              className="input mt-1 w-full bg-slate-50"
              value={age != null ? `${age} years` : '—'}
              readOnly
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-600">
            Gender
            <select
              className="input mt-1 w-full"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block text-sm text-slate-600">
            City / pricing zone
            <select
              className="input mt-1 w-full"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            >
              {cities.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({formatZoneLabel(c.pricingZone)})
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedCity && (
          <p className="text-xs text-slate-500">
            Subscription checkout will use {formatZoneLabel(selectedCity.pricingZone)}.
          </p>
        )}

        <label className="block text-sm text-slate-600">
          Residential address
          <textarea
            className="input mt-1 w-full"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-600">
            Phone number
            <input
              className="input mt-1 w-full"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-slate-600">
            Preferred language
            <input
              className="input mt-1 w-full"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
            />
          </label>
        </div>

        <label className="block text-sm text-slate-600">
          Medical conditions (comma or line separated)
          <textarea
            className="input mt-1 w-full"
            rows={2}
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            placeholder="hypertension, diabetes"
          />
        </label>

        <label className="block text-sm text-slate-600">
          Medications (comma or line separated)
          <textarea
            className="input mt-1 w-full"
            rows={2}
            value={medications}
            onChange={(e) => setMedications(e.target.value)}
            placeholder="Amlodipine 5mg"
          />
        </label>

        <fieldset className="rounded-lg border border-slate-200 p-4">
          <legend className="px-1 text-sm font-medium text-slate-800">Next of kin</legend>
          <div className="space-y-3">
            <input
              className="input w-full"
              placeholder="Full name"
              value={kinName}
              onChange={(e) => setKinName(e.target.value)}
              required
            />
            <input
              className="input w-full"
              type="tel"
              placeholder="Phone"
              value={kinPhone}
              onChange={(e) => setKinPhone(e.target.value)}
              required
            />
            <input
              className="input w-full"
              placeholder="Address"
              value={kinAddress}
              onChange={(e) => setKinAddress(e.target.value)}
              required
            />
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-200 p-4">
          <legend className="px-1 text-sm font-medium text-slate-800">Emergency contact</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="input w-full"
              placeholder="Full name"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              required
            />
            <input
              className="input w-full"
              type="tel"
              placeholder="Phone"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              required
            />
          </div>
        </fieldset>

        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-1"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            I confirm the patient (or lawful representative) consents to Myndora Care monitoring,
            CHW visits, and sharing of care data with the family sponsor.
          </span>
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button type="submit" className="btn-primary" disabled={create.isPending}>
          {create.isPending ? 'Saving…' : 'Continue to checkout'}
        </button>
      </form>
    </>
  );
}
