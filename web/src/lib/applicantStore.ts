import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ApplicantStatus = 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED';
export type ApplicantStep = 'identity' | 'qualifications' | 'references' | 'training';

export interface IdentityData {
  legalName: string;
  phone: string;
  photoName: string;
  nin: string;
}

export interface QualificationsData {
  qualification: string;
  registration: string;
  yearsExperience: number;
}

export interface Referee {
  name: string;
  phone: string;
}

export interface TrainingData {
  studiedModuleIds: string[];
}

type StepMap = {
  identity: IdentityData;
  qualifications: QualificationsData;
  references: [Referee, Referee];
  training: TrainingData;
};

type StepPatch<K extends ApplicantStep> = K extends 'references'
  ? [Referee, Referee]
  : Partial<StepMap[K]>;

const emptyIdentity = (): IdentityData => ({
  legalName: '',
  phone: '',
  photoName: '',
  nin: '',
});

const emptyQualifications = (): QualificationsData => ({
  qualification: '',
  registration: '',
  yearsExperience: 0,
});

const emptyReferences = (): [Referee, Referee] => [
  { name: '', phone: '' },
  { name: '', phone: '' },
];

const emptyTraining = (): TrainingData => ({ studiedModuleIds: [] });

function emptyState() {
  return {
    identity: emptyIdentity(),
    qualifications: emptyQualifications(),
    references: emptyReferences(),
    training: emptyTraining(),
    status: 'DRAFT' as ApplicantStatus,
    applicantName: '',
    city: '',
  };
}

interface ApplicantStore {
  identity: IdentityData;
  qualifications: QualificationsData;
  references: [Referee, Referee];
  training: TrainingData;
  status: ApplicantStatus;
  applicantName: string;
  city: string;
  updateStepData: <K extends ApplicantStep>(step: K, data: StepPatch<K>) => void;
  submitApplication: () => void;
  resetApplication: () => void;
  seedFromUser: (name: string, city?: string, phone?: string) => void;
}

export const useApplicantStore = create<ApplicantStore>()(
  persist(
    (set, get) => ({
      ...emptyState(),
      updateStepData: (step, data) => {
        const current = get();
        const locked = current.status !== 'DRAFT';
        if (locked) return;

        if (step === 'identity') {
          const identity = { ...current.identity, ...(data as Partial<IdentityData>) };
          set({
            identity,
            applicantName: identity.legalName || current.applicantName,
          });
          return;
        }
        if (step === 'qualifications') {
          set({
            qualifications: {
              ...current.qualifications,
              ...(data as Partial<QualificationsData>),
            },
          });
          return;
        }
        if (step === 'references') {
          const refs = data as [Referee, Referee] | Referee[];
          set({
            references: [
              { name: refs[0]?.name ?? '', phone: refs[0]?.phone ?? '' },
              { name: refs[1]?.name ?? '', phone: refs[1]?.phone ?? '' },
            ],
          });
          return;
        }
        set({
          training: { ...current.training, ...(data as Partial<TrainingData>) },
        });
      },
      submitApplication: () => set({ status: 'UNDER_REVIEW' }),
      resetApplication: () => set(emptyState()),
      seedFromUser: (name, city, phone) => {
        const current = get();
        if (current.identity.legalName || current.applicantName) return;
        set({
          applicantName: name,
          city: city ?? current.city,
          identity: {
            ...current.identity,
            legalName: name,
            phone: phone ?? current.identity.phone,
          },
        });
      },
    }),
    { name: 'myndora-chw-application' },
  ),
);
