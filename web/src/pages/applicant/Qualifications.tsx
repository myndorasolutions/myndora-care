import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplication } from './ApplicantLayout';
import { Badge, Btn, Card, Field, Input, PageHeader } from '@/components/kit';

export function ApplicantQualificationsPage() {
  const navigate = useNavigate();
  const { qualifications, status, editable, updateStepData } = useApplication();

  const [qualification, setQualification] = useState(qualifications.qualification);
  const [registration, setRegistration] = useState(qualifications.registration);
  const [experience, setExperience] = useState(String(qualifications.yearsExperience || ''));

  useEffect(() => {
    setQualification(qualifications.qualification);
    setRegistration(qualifications.registration);
    setExperience(String(qualifications.yearsExperience || ''));
  }, [qualifications.qualification, qualifications.registration, qualifications.yearsExperience]);

  const saveAndContinue = () => {
    updateStepData('qualifications', {
      qualification,
      registration,
      yearsExperience: Number(experience) || 0,
    });
    navigate('/applicant/references');
  };

  return (
    <div>
      <PageHeader
        title="Qualifications"
        subtitle="What you submitted and where each item stands in the qualification review."
      />
      <Card className="space-y-3.5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Qualification">
            <Input
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              readOnly={!editable}
              aria-label="Qualification"
            />
          </Field>
          <Field label="Registration / licence number">
            <Input
              value={registration}
              onChange={(e) => setRegistration(e.target.value)}
              readOnly={!editable}
              aria-label="Registration number"
            />
          </Field>
          <Field label="Years of experience">
            <Input
              type="number"
              min={0}
              max={50}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              readOnly={!editable}
              aria-label="Years of experience"
            />
          </Field>
          <Field label="Review status">
            <div className="pt-2">
              <Badge
                tone={status === 'APPROVED' ? 'green' : status === 'UNDER_REVIEW' ? 'amber' : 'gray'}
              >
                {status === 'APPROVED' ? 'Passed' : status === 'UNDER_REVIEW' ? 'In review' : 'Draft'}
              </Badge>
            </div>
          </Field>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" variant="secondary" onClick={() => navigate('/applicant/identity')}>
            Back
          </Btn>
          <Btn size="sm" disabled={!editable} onClick={saveAndContinue}>
            Save & continue
          </Btn>
        </div>
      </Card>
    </div>
  );
}
