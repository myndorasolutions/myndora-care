import { useState } from 'react';
import { Badge, Btn, Card, PageHeader, Select } from '@/components/kit';
import {
  ILORIN_CHW_PROFILES,
  TRUST_BADGES,
} from '@/lib/pilotData';
import { useSponsorSelectedPatient } from '@/lib/sponsorQueries';

export function SponsorCareTeamPage() {
  const { patients, selectedPatient, selectedPatientId, setSelectedPatientId } =
    useSponsorSelectedPatient();
  const [selectedChwId, setSelectedChwId] = useState<string>(
    ILORIN_CHW_PROFILES[0]?.id ?? '',
  );

  const city = selectedPatient?.city ?? 'Ilorin';

  return (
    <div>
      <PageHeader
        title="Care Team"
        subtitle={`Suggested community health workers near ${city}`}
        actions={
          patients.length > 1 ? (
            <Select
              value={selectedPatientId ?? ''}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              aria-label="Select patient"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </Select>
          ) : undefined
        }
      />

      <p className="mb-4 text-sm text-slate-500">
        Assignment is local UI only until a CHW roster API is available.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {ILORIN_CHW_PROFILES.map((chw) => {
          const selected = chw.id === selectedChwId;
          return (
            <Card key={chw.id} className={selected ? 'ring-2 ring-[var(--role-accent,var(--blue))]' : ''}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900">{chw.name}</p>
                  <p className="text-sm text-slate-500">
                    {chw.area} · {chw.yearsExperience} yrs experience
                  </p>
                </div>
                {selected && <Badge tone="green">Preferred</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {chw.badges.map((badgeId) => {
                  const badge = TRUST_BADGES.find((b) => b.id === badgeId);
                  return badge ? (
                    <Badge key={badgeId} tone="blue">
                      {badge.label}
                    </Badge>
                  ) : null;
                })}
              </div>
              <Btn
                size="sm"
                className="mt-4"
                variant={selected ? 'primary' : 'secondary'}
                onClick={() => setSelectedChwId(chw.id)}
              >
                {selected ? 'Selected' : 'Select CHW'}
              </Btn>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
