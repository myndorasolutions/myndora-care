import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplication } from './ApplicantLayout';
import { Badge, Btn, Card, Field, Input, PageHeader } from '@/components/kit';
import { useAuthStore } from '@/stores/authStore';

export function ApplicantIdentityPage() {
  const navigate = useNavigate();
  const { identity, status, editable, updateStepData } = useApplication();
  const user = useAuthStore((s) => s.user);

  const [legalName, setLegalName] = useState(identity.legalName);
  const [phone, setPhone] = useState(identity.phone);
  const [nin, setNin] = useState(identity.nin);
  const [photoName, setPhotoName] = useState(identity.photoName);

  useEffect(() => {
    setLegalName(identity.legalName);
    setPhone(identity.phone);
    setNin(identity.nin);
    setPhotoName(identity.photoName);
  }, [identity.legalName, identity.phone, identity.nin, identity.photoName]);

  const saveAndContinue = () => {
    updateStepData('identity', { legalName, phone, nin, photoName });
    navigate('/applicant/qualifications');
  };

  return (
    <div>
      <PageHeader
        title="Identity & Documents"
        subtitle="Your legal identity as reviewed by our verification team. NIN is masked after submit; documents are checked by staff, never shown to patients."
      />
      <Card className="space-y-3.5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Legal name">
            <Input
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              readOnly={!editable}
              aria-label="Legal name"
            />
          </Field>
          <Field label="Email">
            <Input value={user?.email ?? ''} readOnly aria-label="Email" />
          </Field>
          <Field label="Phone">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              readOnly={!editable}
              aria-label="Phone"
            />
          </Field>
          <Field label="NIN">
            <Input
              value={status !== 'DRAFT' && nin ? `•••••••${nin.slice(-4)}` : nin}
              onChange={(e) => setNin(e.target.value)}
              readOnly={!editable}
              aria-label="NIN"
            />
          </Field>
          <Field label="Profile photo" hint={editable ? 'Choose a photo filename locally' : undefined}>
            {editable ? (
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? '')}
                aria-label="Profile photo"
              />
            ) : (
              <Input value={photoName || 'Not uploaded'} readOnly aria-label="Profile photo" />
            )}
          </Field>
          <Field label="Document status">
            <div className="pt-2">
              <Badge tone={status === 'DRAFT' ? 'gray' : status === 'APPROVED' ? 'green' : 'amber'}>
                {status === 'DRAFT' ? 'Draft' : status === 'APPROVED' ? 'Verified' : 'Under staff review'}
              </Badge>
            </div>
          </Field>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" disabled={!editable} onClick={saveAndContinue}>
            Save & continue
          </Btn>
        </div>
      </Card>
    </div>
  );
}
