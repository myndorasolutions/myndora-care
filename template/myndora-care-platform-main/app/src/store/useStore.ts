// Global application store — Zustand with localStorage persistence.
// Every workflow in the prototype mutates real local state here.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { buildSeed, type SeedData } from '@/data/seed';
import { tierRank } from '@/lib/permissions';
import { nowIso, uid } from '@/lib/format';
import type {
  AccessLevel, AddOnType, Assignment, CHWStatus, City, Complaint, ComplaintStage,
  ComplaintType, ConsentAuthorization, PackageTier, ReferralKind, Role, ServiceRateRequest,
  VerificationMethod, Visit, VitalsReading, RequestKind,
} from '@/types';

export interface PaymentRecord {
  id: string;
  patientId: string;
  label: string;
  amount: number;
  status: 'paid' | 'due' | 'failed';
  date: string;
  method: string;
}

/** Which world entities the signed-in account operates as. */
export interface Identity {
  patientId: string;
  sponsorAccountId: string;
  chwId: string;
  clinicianAccountId: string;
}

export interface PortalMessage {
  id: string;
  audience: 'sponsor' | 'patient' | 'chw' | 'clinician';
  thread: string;
  from: string;
  text: string;
  at: string;
  mine: boolean;
}

export const DEFAULT_IDENTITY: Identity = {
  patientId: 'pat-grace',
  sponsorAccountId: 'acc-sponsor',
  chwId: 'chw-amina',
  clinicianAccountId: 'acc-clinician',
};

function seedMessages(): PortalMessage[] {
  return [
    { id: 'msg-1', audience: 'sponsor', thread: 'Care coordination — Grace Okafor', from: 'Myndora Care Team', text: 'Grace\'s next visit is confirmed for 3 Aug, 10:00 with Amina Bello. We will share the visit summary afterwards, within her approved access level.', at: '2026-07-30T12:10:00', mine: false },
    { id: 'msg-2', audience: 'sponsor', thread: 'Care coordination — Grace Okafor', from: 'Tunde Adeyemi', text: 'Thank you — please also confirm the lab sample collection add-on is still active.', at: '2026-07-30T13:02:00', mine: true },
    { id: 'msg-3', audience: 'sponsor', thread: 'Care coordination — Grace Okafor', from: 'Myndora Care Team', text: 'Confirmed — lab sample collection remains active on the Assisted Monitoring plan.', at: '2026-07-30T14:20:00', mine: false },
    { id: 'msg-4', audience: 'patient', thread: 'Amina Bello (your CHW)', from: 'Amina Bello', text: 'Good afternoon Mama, this is to remind you about your morning blood pressure checks. I will see you on 3 Aug at 10:00.', at: '2026-07-29T15:40:00', mine: false },
    { id: 'msg-5', audience: 'patient', thread: 'Amina Bello (your CHW)', from: 'Grace Okafor', text: 'Thank you my dear. I have been taking the readings every morning.', at: '2026-07-29T16:05:00', mine: true },
    { id: 'msg-6', audience: 'chw', thread: 'Operations — visit scheduling', from: 'Myndora Operations', text: 'Amina, a new assignment offer for Grace Okafor (home visit, 3 Aug 10:00) is waiting for your response.', at: '2026-07-28T09:30:00', mine: false },
    { id: 'msg-7', audience: 'clinician', thread: 'Case referral — Grace Okafor', from: 'Myndora Operations', text: 'New escalation case-1 assigned for your review: severe hypertension reading for patient Grace Okafor (visit v-101).', at: '2026-07-24T16:05:00', mine: false },
    { id: 'msg-8', audience: 'clinician', thread: 'Lab follow-up — Ngozi Eze', from: 'Myndora Operations', text: 'Lab report lr-301 (Lipid Panel) for patient Ngozi Eze was flagged abnormal and is awaiting your clinical review.', at: '2026-07-20T11:30:00', mine: false },
    { id: 'msg-9', audience: 'clinician', thread: 'Verification', from: 'Myndora Care Admin', text: 'Your clinician verification is complete. Welcome to the Myndora Care clinical network.', at: '2026-07-01T08:00:00', mine: false },
  ];
}

export interface VitalDraftEntry {
  kind: string;
  label: string;
  value: string;
  unit: string;
  abnormal: boolean;
  repeated: boolean;
}

export interface ActiveVisitDraft {
  visitId: string;
  startedAt: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  verificationMethod?: VerificationMethod;
  otpVerified: boolean;
  checklist: Record<string, boolean>;
  vitals: VitalDraftEntry[];
  patientReported: string;
  chwObservation: string;
  actionTaken: string;
  symptoms: string;
  medicationReminder: string;
  followUpRequired: boolean;
  presentPersons: { name: string; relationship: string; consented: boolean }[];
  notes: string;
  escalationRaised: boolean;
  abnormalPendingRepeat: boolean;
}

function seedPayments(): PaymentRecord[] {
  return [
    { id: 'pay-1', patientId: 'pat-grace', label: 'Assisted Monitoring — July', amount: 24500, status: 'paid', date: '2026-07-15', method: 'Visa •• 4412' },
    { id: 'pay-2', patientId: 'pat-grace', label: 'Lab collection add-on', amount: 3540, status: 'paid', date: '2026-07-28', method: 'Visa •• 4412' },
    { id: 'pay-3', patientId: 'pat-ngozi', label: 'Family Dashboard — July', amount: 15000, status: 'paid', date: '2026-07-20', method: 'Visa •• 4412' },
    { id: 'pay-4', patientId: 'pat-grace', label: 'Assisted Monitoring — August', amount: 24500, status: 'due', date: '2026-08-15', method: 'Visa •• 4412' },
  ];
}

interface StoreData extends SeedData {
  currentRole: Role;
  payments: PaymentRecord[];
  clinicianAvailable: boolean;
  activeVisit: ActiveVisitDraft | null;
  identity: Identity;
  messages: PortalMessage[];
  /** Which package tiers are sellable per city (admin-controlled). */
  packageAvailability: Record<City, PackageTier[]>;
}

interface StoreActions {
  switchRole: (role: Role) => void;
  resetDemo: () => void;
  selectPatient: (patientId: string) => void;

  // packages & billing
  changeTier: (patientId: string, tier: PackageTier) => 'upgraded' | 'downgrade_scheduled' | 'same';
  cancelScheduledDowngrade: (patientId: string) => void;
  pausePlan: (patientId: string) => void;
  resumePlan: (patientId: string) => void;
  cancelPlan: (patientId: string) => void;
  changeCity: (patientId: string, city: City, neighbourhood?: string) => void;
  toggleAddOn: (patientId: string, addOn: AddOnType) => void;
  payNow: (paymentId: string) => void;

  // consent & access
  requestAccess: (patientId: string, level: AccessLevel) => void;
  decideAccess: (consentId: string, decision: 'approved' | 'reduced' | 'rejected', grantedLevel?: AccessLevel) => void;
  withdrawAccess: (patientId: string, requesterAccountId: string) => void;

  // patient preferences & CHW choice
  setPreferences: (patientId: string, prefs: { genderPreference?: 'any' | 'female' | 'male'; languagePreference?: string }) => void;
  setLocationConsent: (patientId: string, given: boolean) => void;
  setManualLocation: (patientId: string, city: City, neighbourhood: string, address: string) => void;
  selectChw: (patientId: string, chwId: string) => void;
  rejectChw: (patientId: string, chwId: string) => void;
  blockChw: (patientId: string, chwId: string) => void;

  // visits — patient side
  confirmVisit: (visitId: string) => void;
  disputeVisit: (visitId: string, reason: string) => void;
  rescheduleVisit: (visitId: string, when: string) => void;
  rateChw: (visitId: string, stars: number, comment: string) => boolean;

  // complaints
  submitComplaint: (input: { patientId: string; chwId?: string; raisedByRole: Role; raisedByName: string; type: ComplaintType; details: string }) => void;
  advanceComplaint: (id: string, stage: ComplaintStage, note: string) => void;
  setComplaintSeverity: (id: string, severity: Complaint['severity']) => void;
  resolveComplaint: (id: string, resolution: string) => void;

  // CHW side
  setAvailability: (chwId: string, available: boolean) => void;
  acceptAssignment: (id: string) => void;
  declineAssignment: (id: string) => void;
  requestServiceChange: (chwId: string, kind: RequestKind, description: string) => void;
  syncOfflineQueue: () => void;

  // active visit workflow
  startVisit: (visitId: string) => void;
  checkInVisit: () => void;
  verifyPatient: (method: VerificationMethod) => void;
  toggleChecklistItem: (item: string) => void;
  addVitalDraft: (entry: VitalDraftEntry) => void;
  markRepeatDone: (kind: string, value: string, abnormal: boolean) => void;
  setDraftField: <K extends keyof ActiveVisitDraft>(field: K, value: ActiveVisitDraft[K]) => void;
  addPresentPerson: (person: { name: string; relationship: string; consented: boolean }) => void;
  raiseEscalation: (reason: string) => void;
  checkOutVisit: () => void;
  submitActiveVisit: () => void;
  cancelActiveVisit: () => void;

  // alerts
  acknowledgeAlert: (id: string) => void;
  resolveAlert: (id: string) => void;

  // admin
  setChwStatus: (chwId: string, status: CHWStatus) => void;
  decideServiceRequest: (id: string, approve: boolean) => void;
  reassignPatient: (patientId: string, toChwId: string) => void;
  reviewDqFlag: (id: string, outcome: 'reviewed' | 'dismissed') => void;
  toggleRateCardStatus: (id: string) => void;
  updateRateCardCharge: (id: string, baseCharge: number) => void;
  freezePayout: (visitId: string, frozen: boolean) => void;

  // integrations (simulated)
  bookReferral: (patientId: string, kind: ReferralKind, partner: string, description: string) => void;
  routeReferralToClinician: (id: string) => void;

  // clinician
  setClinicianAvailable: (available: boolean) => void;
  reviewCase: (caseId: string, input: { recommendation: string; patientSummary: string; sponsorSummary: string; outcome: 'resolved' | 'more_info' }) => void;

  logAudit: (actor: string, actorRole: Role, action: string, target: string, flaggedUnusual?: boolean) => void;

  // identity & onboarding
  setIdentity: (patch: Partial<Identity>) => void;
  hydrate: (data: Record<string, unknown>) => void;
  sendMessage: (audience: PortalMessage['audience'], thread: string, from: string, text: string) => void;
  provisionPatient: (input: { name: string; phone: string; language: string; city: City; address: string; tier: PackageTier; emergencyContact?: string }) => string;
  provisionSponsor: (input: { name: string; phone: string }) => string;
  /** Sponsor onboarding: add a patient the sponsor supports (payment-linked, access patient-controlled). */
  provisionLinkedPatient: (input: { sponsorAccountId: string; sponsorName: string; patientName: string; relationship: string; city: City; tier: PackageTier; requestedLevel: AccessLevel }) => string;
  ensureChwIdentity: (name: string, city?: City) => string;

  // CHW profile self-service & admin verification
  updateChwProfile: (chwId: string, patch: Partial<import('@/types').CHWProfile>) => void;
  setChwVerification: (chwId: string, key: keyof import('@/types').CHWProfile['verification'], value: boolean) => void;
  togglePackageCity: (city: City, tier: PackageTier) => void;
}

export type Store = StoreData & StoreActions;

function seedPackageAvailability(): Record<City, PackageTier[]> {
  return {
    Lagos: ['basic', 'family', 'assisted', 'premium'],
    Ilorin: ['basic', 'family', 'assisted'],
    Abuja: ['basic', 'family', 'assisted'],
    Other: ['basic'],
  };
}

const ROLE_ACTOR: Record<Role, string> = {
  sponsor: 'Tunde Adeyemi',
  patient: 'Grace Okafor',
  chw: 'Amina Bello',
  admin: 'Adaeze Okonkwo',
  clinician: 'Dr. Olumide Ajayi',
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...buildSeed(),
      currentRole: 'sponsor',
      payments: seedPayments(),
      clinicianAvailable: true,
      activeVisit: null,
      identity: DEFAULT_IDENTITY,
      messages: seedMessages(),
      packageAvailability: seedPackageAvailability(),

      switchRole: (role) => set({ currentRole: role }),

      resetDemo: () => {
        set({ ...buildSeed(), payments: seedPayments(), clinicianAvailable: true, activeVisit: null, messages: seedMessages(), packageAvailability: seedPackageAvailability() });
      },

      setIdentity: (patch) => set((s) => ({ identity: { ...s.identity, ...patch } })),

      hydrate: (data) => {
        set({ ...buildSeed(), payments: seedPayments(), clinicianAvailable: true, activeVisit: null, messages: seedMessages(), identity: DEFAULT_IDENTITY, packageAvailability: seedPackageAvailability(), ...data });
      },

      sendMessage: (audience, thread, from, text) =>
        set((s) => ({ messages: [...s.messages, { id: uid('msg'), audience, thread, from, text, at: nowIso(), mine: true }] })),

      provisionPatient: (input) => {
        const id = uid('pat');
        const accountId = uid('acc');
        set((s) => ({
          accounts: [...s.accounts, { id: accountId, name: input.name, role: 'patient' as const, phone: input.phone, city: input.city }],
          patients: [...s.patients, {
            id, accountId, name: input.name, age: 0, city: input.city,
            neighbourhood: '', address: input.address, conditions: [],
            languagePreference: input.language, genderPreference: 'any' as const, locationConsentGiven: true,
          }],
          subscriptions: [...s.subscriptions, {
            id: uid('sub'), patientId: id, tier: input.tier, status: 'active' as const,
            nextBillingDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10), addOns: [],
          }],
          identity: { ...s.identity, patientId: id },
          selectedPatientId: id,
        }));
        get().logAudit(input.name, 'patient', 'account.patient_onboarded', id);
        return id;
      },

      provisionSponsor: (input) => {
        const accountId = uid('acc');
        set((s) => ({
          accounts: [...s.accounts, { id: accountId, name: input.name, role: 'sponsor' as const, phone: input.phone, city: 'Lagos' as const }],
          identity: { ...s.identity, sponsorAccountId: accountId },
        }));
        get().logAudit(input.name, 'sponsor', 'account.sponsor_onboarded', accountId);
        return accountId;
      },

      provisionLinkedPatient: (input) => {
        const patientId = uid('pat');
        const accountId = uid('acc');
        set((s) => ({
          accounts: [...s.accounts, { id: accountId, name: input.patientName, role: 'patient' as const, phone: '', city: input.city }],
          patients: [...s.patients, {
            id: patientId, accountId, name: input.patientName, age: 0, city: input.city,
            neighbourhood: '', address: '', conditions: [],
            languagePreference: 'English', genderPreference: 'any' as const, locationConsentGiven: false,
          }],
          relationships: [...s.relationships, {
            id: uid('rel'), sponsorAccountId: input.sponsorAccountId, patientId,
            paysFor: true, accessLevel: 'payment_only' as const,
          }],
          subscriptions: [...s.subscriptions, {
            id: uid('sub'), patientId, tier: input.tier, status: 'active' as const,
            nextBillingDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10), addOns: [],
          }],
          selectedPatientId: patientId,
        }));
        get().logAudit(input.sponsorName, 'sponsor', 'patient.linked', `${input.patientName} (${input.relationship})`);
        if (input.requestedLevel !== 'payment_only') {
          const consent: ConsentAuthorization = {
            id: uid('con'), patientId, requesterName: input.sponsorName, requesterAccountId: input.sponsorAccountId,
            requestedLevel: input.requestedLevel, status: 'pending', createdAt: nowIso(),
            note: 'Requested during sponsor onboarding. Patient decision required.',
          };
          set((s) => ({ consents: [consent, ...s.consents] }));
          get().logAudit(input.sponsorName, 'sponsor', 'access.requested', `${patientId} → ${input.requestedLevel}`);
        }
        return patientId;
      },

      ensureChwIdentity: (name, city) => {
        const s = get();
        const existing = s.chws.find((c) => c.id === s.identity.chwId);
        if (existing) return existing.id;
        const id = uid('chw');
        set((st) => ({
          chws: [...st.chws, {
            id, name, cadre: 'CHEW' as const, yearsExperience: 1,
            languages: ['English'], city: city ?? 'Ilorin', serviceArea: 'City centre',
            baseRadiusKm: 5, distanceKm: 2.5, etaMinutes: 15,
            rating: 0, reviewCount: 0, completedVisits: 0, available: true,
            status: 'approved' as const,
            approvedServices: ['remote_check' as const], conditionTraining: [],
            reliabilityScore: 100, complaintCount: 0, workload: 0, photoVerified: false,
            verification: { nin: 'pending', identityChecked: false, qualificationsChecked: false, referencesChecked: false, backgroundChecked: false, trainingCompleted: false },
          }],
          identity: { ...st.identity, chwId: id },
        }));
        return id;
      },

      updateChwProfile: (chwId, patch) => {
        set((s) => ({ chws: s.chws.map((c) => (c.id === chwId ? { ...c, ...patch } : c)) }));
        get().logAudit(get().chws.find((c) => c.id === chwId)?.name ?? 'CHW', 'chw', 'chw.profile_updated', chwId);
      },

      setChwVerification: (chwId, key, value) => {
        set((s) => ({
          chws: s.chws.map((c) => (c.id === chwId ? { ...c, verification: { ...c.verification, [key]: value } } : c)),
        }));
        get().logAudit(ROLE_ACTOR.admin, 'admin', `credential.${value ? 'verified' : 'unverified'}`, `${chwId} → ${key}`);
      },

      togglePackageCity: (city, tier) =>
        set((s) => ({
          packageAvailability: {
            ...s.packageAvailability,
            [city]: s.packageAvailability[city].includes(tier)
              ? s.packageAvailability[city].filter((t) => t !== tier)
              : [...s.packageAvailability[city], tier],
          },
        })),

      selectPatient: (patientId) => set({ selectedPatientId: patientId }),

      logAudit: (actor, actorRole, action, target, flaggedUnusual) =>
        set((s) => ({
          auditEvents: [{ id: uid('aud'), actor, actorRole, action, target, at: nowIso(), flaggedUnusual }, ...s.auditEvents],
        })),

      // ---------------------------------------------------------------- packages
      changeTier: (patientId, tier) => {
        const sub = get().subscriptions.find((x) => x.patientId === patientId);
        if (!sub || sub.tier === tier) return 'same';
        const isUpgrade = tierRank(tier) > tierRank(sub.tier);
        set((s) => ({
          subscriptions: s.subscriptions.map((x) =>
            x.patientId !== patientId ? x :
              isUpgrade
                ? { ...x, tier, status: 'active' as const, scheduledDowngradeTo: undefined }
                : { ...x, scheduledDowngradeTo: tier },
          ),
        }));
        get().logAudit(ROLE_ACTOR[get().currentRole], get().currentRole, isUpgrade ? 'plan.upgraded' : 'plan.downgrade_scheduled', `${patientId} → ${tier}`);
        return isUpgrade ? 'upgraded' : 'downgrade_scheduled';
      },

      cancelScheduledDowngrade: (patientId) =>
        set((s) => ({
          subscriptions: s.subscriptions.map((x) => (x.patientId === patientId ? { ...x, scheduledDowngradeTo: undefined } : x)),
        })),

      pausePlan: (patientId) =>
        set((s) => ({ subscriptions: s.subscriptions.map((x) => (x.patientId === patientId ? { ...x, status: 'paused' as const } : x)) })),

      resumePlan: (patientId) =>
        set((s) => ({ subscriptions: s.subscriptions.map((x) => (x.patientId === patientId ? { ...x, status: 'active' as const } : x)) })),

      cancelPlan: (patientId) =>
        set((s) => ({ subscriptions: s.subscriptions.map((x) => (x.patientId === patientId ? { ...x, status: 'pending_cancellation' as const } : x)) })),

      changeCity: (patientId, city, neighbourhood) => {
        set((s) => ({
          patients: s.patients.map((p) => (p.id === patientId ? { ...p, city, neighbourhood: neighbourhood ?? p.neighbourhood } : p)),
        }));
        get().logAudit(ROLE_ACTOR[get().currentRole], get().currentRole, 'location.changed', `${patientId} → ${city}`);
      },

      toggleAddOn: (patientId, addOn) =>
        set((s) => ({
          subscriptions: s.subscriptions.map((x) =>
            x.patientId !== patientId ? x : {
              ...x,
              addOns: x.addOns.includes(addOn) ? x.addOns.filter((a) => a !== addOn) : [...x.addOns, addOn],
            }),
        })),

      payNow: (paymentId) => {
        set((s) => ({ payments: s.payments.map((p) => (p.id === paymentId ? { ...p, status: 'paid' as const } : p)) }));
        get().logAudit('Tunde Adeyemi', 'sponsor', 'payment.completed', paymentId);
      },

      // ---------------------------------------------------------------- consent
      requestAccess: (patientId, level) => {
        const requesterAccountId = get().identity.sponsorAccountId;
        const requesterName = get().accounts.find((a) => a.id === requesterAccountId)?.name ?? 'Sponsor';
        const existing = get().consents.find((c) => c.patientId === patientId && c.requesterAccountId === requesterAccountId && c.status === 'pending');
        if (existing) return;
        const consent: ConsentAuthorization = {
          id: uid('con'), patientId, requesterName, requesterAccountId,
          requestedLevel: level, status: 'pending', createdAt: nowIso(), note: 'Requested by sponsor. Patient decision required.',
        };
        set((s) => ({ consents: [consent, ...s.consents] }));
        get().logAudit(requesterName, 'sponsor', 'access.requested', `${patientId} → ${level}`);
      },

      decideAccess: (consentId, decision, grantedLevel) => {
        const consent = get().consents.find((c) => c.id === consentId);
        if (!consent) return;
        set((s) => ({
          consents: s.consents.map((c) =>
            c.id !== consentId ? c : {
              ...c, status: decision, decidedAt: nowIso(),
              grantedLevel: decision === 'approved' ? c.requestedLevel : decision === 'reduced' ? grantedLevel : undefined,
            }),
          relationships:
            decision === 'rejected'
              ? s.relationships
              : s.relationships.map((r) =>
                r.patientId === consent.patientId && r.sponsorAccountId === consent.requesterAccountId
                  ? { ...r, accessLevel: (decision === 'approved' ? consent.requestedLevel : grantedLevel!) as AccessLevel }
                  : r),
        }));
        get().logAudit('Grace Okafor', 'patient', `consent.${decision}`, consentId);
      },

      withdrawAccess: (patientId, requesterAccountId) => {
        set((s) => ({
          relationships: s.relationships.map((r) =>
            r.patientId === patientId && r.sponsorAccountId === requesterAccountId ? { ...r, accessLevel: 'payment_only' as const } : r),
          consents: s.consents.map((c) =>
            c.patientId === patientId && c.requesterAccountId === requesterAccountId && c.status === 'approved'
              ? { ...c, status: 'withdrawn' as const, decidedAt: nowIso() } : c),
        }));
        get().logAudit('Grace Okafor', 'patient', 'consent.withdrawn', `${patientId}/${requesterAccountId}`);
      },

      // ---------------------------------------------------------------- patient prefs
      setPreferences: (patientId, prefs) =>
        set((s) => ({ patients: s.patients.map((p) => (p.id === patientId ? { ...p, ...prefs } : p)) })),

      setLocationConsent: (patientId, given) =>
        set((s) => ({ patients: s.patients.map((p) => (p.id === patientId ? { ...p, locationConsentGiven: given } : p)) })),

      setManualLocation: (patientId, city, neighbourhood, address) =>
        set((s) => ({ patients: s.patients.map((p) => (p.id === patientId ? { ...p, city, neighbourhood, address } : p)) })),

      selectChw: (patientId, chwId) => {
        set((s) => ({ selectedChwByPatient: { ...s.selectedChwByPatient, [patientId]: chwId } }));
        get().logAudit(ROLE_ACTOR[get().currentRole], get().currentRole, 'chw.selected', `${patientId} → ${chwId}`);
      },

      rejectChw: (patientId, chwId) => {
        set((s) => {
          const next = { ...s.selectedChwByPatient };
          if (next[patientId] === chwId) delete next[patientId];
          return { selectedChwByPatient: next };
        });
        get().logAudit('Grace Okafor', 'patient', 'chw.rejected', `${patientId} → ${chwId}`);
      },

      blockChw: (patientId, chwId) => {
        set((s) => {
          const blocked = { ...s.blockedChws };
          blocked[patientId] = Array.from(new Set([...(blocked[patientId] ?? []), chwId]));
          const next = { ...s.selectedChwByPatient };
          if (next[patientId] === chwId) delete next[patientId];
          return { blockedChws: blocked, selectedChwByPatient: next };
        });
        get().logAudit('Grace Okafor', 'patient', 'chw.blocked', `${patientId} → ${chwId}`);
      },

      // ---------------------------------------------------------------- visits (patient)
      confirmVisit: (visitId) => {
        set((s) => ({
          visits: s.visits.map((v) => (v.id === visitId ? { ...v, patientConfirmed: true, status: 'verified' as const, evidence: { ...v.evidence, patientAcknowledged: true } } : v)),
        }));
        get().logAudit('Grace Okafor', 'patient', 'visit.confirmed', visitId);
      },

      disputeVisit: (visitId, reason) => {
        set((s) => ({
          visits: s.visits.map((v) => (v.id === visitId ? { ...v, disputed: true, disputeReason: reason, status: 'disputed' as const, payoutFrozen: true } : v)),
          dqFlags: [{ id: uid('dq'), kind: 'disputed_visit' as const, description: `Visit disputed: ${reason}`, visitId, status: 'open' as const, createdAt: nowIso() }, ...s.dqFlags],
        }));
        get().logAudit('Grace Okafor', 'patient', 'visit.disputed', visitId);
      },

      rescheduleVisit: (visitId, when) =>
        set((s) => ({ visits: s.visits.map((v) => (v.id === visitId ? { ...v, scheduledFor: when } : v)) })),

      rateChw: (visitId, stars, comment) => {
        const visit = get().visits.find((v) => v.id === visitId);
        // Ratings only after a verified, patient-confirmed completed visit.
        if (!visit || visit.status !== 'verified' || !visit.patientConfirmed) return false;
        if (get().ratings.some((r) => r.visitId === visitId)) return false;
        set((s) => ({
          ratings: [{ id: uid('rate'), patientId: visit.patientId, chwId: visit.chwId, visitId, stars, comment, createdAt: nowIso() }, ...s.ratings],
        }));
        get().logAudit('Grace Okafor', 'patient', 'chw.rated', `${visit.chwId} ${stars}★`);
        return true;
      },

      // ---------------------------------------------------------------- complaints
      submitComplaint: ({ patientId, chwId, raisedByRole, raisedByName, type, details }) => {
        const complaint: Complaint = {
          id: uid('cmp'), patientId, chwId, raisedByRole, raisedByName, type, details,
          stage: 'submitted', severity: type === 'safety_concern' ? 'safety' : undefined,
          createdAt: nowIso(),
          history: [
            { stage: 'submitted', at: nowIso(), note: `Submitted by ${raisedByName}.` },
            { stage: 'acknowledged', at: nowIso(), note: 'Auto-acknowledged by platform.' },
          ],
        };
        set((s) => ({
          complaints: [complaint, ...s.complaints],
          // Safety complaints suspend future direct matching until reviewed.
          chws: type === 'safety_concern' && chwId
            ? s.chws.map((c) => (c.id === chwId ? { ...c, matchingSuspended: true } : c))
            : s.chws,
        }));
        get().logAudit(raisedByName, raisedByRole, 'complaint.submitted', type);
      },

      advanceComplaint: (id, stage, note) =>
        set((s) => ({
          complaints: s.complaints.map((c) =>
            c.id === id ? { ...c, stage, history: [...c.history, { stage, at: nowIso(), note }] } : c),
        })),

      setComplaintSeverity: (id, severity) =>
        set((s) => ({ complaints: s.complaints.map((c) => (c.id === id ? { ...c, severity } : c)) })),

      resolveComplaint: (id, resolution) =>
        set((s) => ({
          complaints: s.complaints.map((c) =>
            c.id === id ? {
              ...c, stage: 'resolved' as const, resolution,
              history: [...c.history, { stage: 'resolved' as const, at: nowIso(), note: resolution }],
            } : c),
          // Reviewed safety complaints can restore matching
          chws: s.chws.map((chw) => {
            const cmp = s.complaints.find((c) => c.id === id);
            return cmp?.type === 'safety_concern' && cmp.chwId === chw.id ? { ...chw, matchingSuspended: false } : chw;
          }),
        })),

      // ---------------------------------------------------------------- CHW
      setAvailability: (chwId, available) =>
        set((s) => ({ chws: s.chws.map((c) => (c.id === chwId ? { ...c, available } : c)) })),

      acceptAssignment: (id) => {
        set((s) => ({ assignments: s.assignments.map((a) => (a.id === id ? { ...a, status: 'accepted' as const } : a)) }));
        get().logAudit('Amina Bello', 'chw', 'assignment.accepted', id);
      },

      declineAssignment: (id) => {
        set((s) => ({ assignments: s.assignments.map((a) => (a.id === id ? { ...a, status: 'declined' as const } : a)) }));
        get().logAudit('Amina Bello', 'chw', 'assignment.declined', id);
      },

      requestServiceChange: (chwId, kind, description) => {
        const req: ServiceRateRequest = { id: uid('srr'), chwId, kind, description, status: 'pending', createdAt: nowIso() };
        set((s) => ({ serviceRequests: [req, ...s.serviceRequests] }));
        get().logAudit('Amina Bello', 'chw', 'service_change.requested', kind);
      },

      syncOfflineQueue: () =>
        set((s) => ({ offlineQueue: s.offlineQueue.map((q) => ({ ...q, synced: true })) })),

      // ---------------------------------------------------------------- active visit
      startVisit: (visitId) => {
        const visit = get().visits.find((v) => v.id === visitId);
        if (!visit) return;
        const checklist: Record<string, boolean> = {};
        visit.requestedServices.forEach((svc) => { checklist[svc] = false; });
        set((s) => ({
          visits: s.visits.map((v) => (v.id === visitId ? { ...v, status: 'in_progress' as const } : v)),
          activeVisit: {
            visitId, startedAt: nowIso(), otpVerified: false, checklist, vitals: [],
            patientReported: '', chwObservation: '', actionTaken: '', symptoms: '',
            medicationReminder: '', followUpRequired: false, presentPersons: [], notes: '',
            escalationRaised: false, abnormalPendingRepeat: false,
          },
        }));
        get().logAudit('Amina Bello', 'chw', 'visit.started', visitId);
      },

      checkInVisit: () => {
        const draft = get().activeVisit;
        if (!draft) return;
        const ts = nowIso();
        set((s) => ({
          activeVisit: { ...draft, checkedInAt: ts },
          visits: s.visits.map((v) => v.id === draft.visitId ? { ...v, evidence: { ...v.evidence, geofenceCheckIn: ts, serverCheckInTimestamp: ts } } : v),
        }));
        get().logAudit('Amina Bello', 'chw', 'visit.checked_in', draft.visitId);
      },

      verifyPatient: (method) => {
        const draft = get().activeVisit;
        if (!draft) return;
        set((s) => ({
          activeVisit: { ...draft, verificationMethod: method, otpVerified: true },
          visits: s.visits.map((v) => v.id === draft.visitId ? { ...v, verificationMethod: method, evidence: { ...v.evidence, verificationMethod: method, otpVerified: true } } : v),
        }));
      },

      toggleChecklistItem: (item) => {
        const draft = get().activeVisit;
        if (!draft) return;
        set({ activeVisit: { ...draft, checklist: { ...draft.checklist, [item]: !draft.checklist[item] } } });
      },

      addVitalDraft: (entry) => {
        const draft = get().activeVisit;
        if (!draft) return;
        set({
          activeVisit: {
            ...draft,
            vitals: [...draft.vitals, entry],
            abnormalPendingRepeat: entry.abnormal ? true : draft.abnormalPendingRepeat,
          },
        });
      },

      markRepeatDone: (kind, value, abnormal) => {
        const draft = get().activeVisit;
        if (!draft) return;
        set({
          activeVisit: {
            ...draft,
            vitals: draft.vitals.map((v) => (v.kind === kind ? { ...v, value, abnormal, repeated: true } : v)),
            abnormalPendingRepeat: abnormal,
          },
        });
      },

      setDraftField: (field, value) => {
        const draft = get().activeVisit;
        if (!draft) return;
        set({ activeVisit: { ...draft, [field]: value } });
      },

      addPresentPerson: (person) => {
        const draft = get().activeVisit;
        if (!draft) return;
        set({ activeVisit: { ...draft, presentPersons: [...draft.presentPersons, person] } });
      },

      raiseEscalation: (reason) => {
        const draft = get().activeVisit;
        if (!draft) return;
        const visit = get().visits.find((v) => v.id === draft.visitId)!;
        const escId = uid('esc');
        set((s) => ({
          escalations: [{ id: escId, patientId: visit.patientId, visitId: visit.id, raisedBy: 'Amina Bello', reason, status: 'open' as const, createdAt: nowIso() }, ...s.escalations],
          alerts: [{
            id: uid('alert'), patientId: visit.patientId, severity: 'urgent' as const, status: 'escalated' as const,
            title: 'Urgent escalation from visit', detail: reason, createdAt: nowIso(), escalationId: escId,
          }, ...s.alerts],
          visits: s.visits.map((v) => (v.id === visit.id ? { ...v, escalationId: escId, followUpRequired: true } : v)),
          activeVisit: { ...draft, escalationRaised: true },
        }));
        get().logAudit('Amina Bello', 'chw', 'escalation.raised', escId);
      },

      checkOutVisit: () => {
        const draft = get().activeVisit;
        if (!draft || !draft.checkedInAt) return;
        const ts = nowIso();
        const durationMin = (new Date(ts).getTime() - new Date(draft.checkedInAt).getTime()) / 60000;
        const plausible = durationMin >= 1; // implausibly short visits get flagged
        set((s) => ({
          activeVisit: { ...draft, checkedOutAt: ts },
          visits: s.visits.map((v) => v.id === draft.visitId ? { ...v, evidence: { ...v.evidence, geofenceCheckOut: ts, serverCheckOutTimestamp: ts, plausibleDuration: plausible } } : v),
          dqFlags: plausible ? s.dqFlags : [{
            id: uid('dq'), kind: 'implausibly_short_visit' as const, description: `Visit ${draft.visitId} lasted under 1 minute.`, visitId: draft.visitId, status: 'open' as const, createdAt: ts,
          }, ...s.dqFlags],
        }));
      },

      submitActiveVisit: () => {
        const draft = get().activeVisit;
        if (!draft) return;
        const s = get();
        const visit = s.visits.find((v) => v.id === draft.visitId)!;
        const patient = s.patients.find((p) => p.id === visit.patientId)!;
        const completed = Object.entries(draft.checklist).filter(([, done]) => done).map(([svc]) => svc);

        const newVitals: VitalsReading[] = draft.vitals.map((v) => ({
          id: uid('vit'), patientId: visit.patientId, visitId: visit.id,
          kind: v.kind === 'blood_pressure' ? 'blood_pressure' : v.kind as VitalsReading['kind'],
          value: v.value, unit: v.unit, recordedBy: 'chw', source: 'measured',
          deviceType: 'Demo device (simulated)', recordedAt: nowIso(), isAbnormal: v.abnormal,
        }));

        const symptoms = draft.symptoms.split(',').map((x) => x.trim()).filter(Boolean);
        const patientSummary = completed.length > 0
          ? `Your visit was completed. Services: ${completed.join(', ')}.${draft.followUpRequired ? ' A follow-up is required.' : ''}`
          : 'Your visit was completed.';
        const sponsorSummary = draft.escalationRaised
          ? 'A visit was completed and an urgent concern was escalated for clinical review.'
          : 'A scheduled visit was completed and documented.';

        set((st) => ({
          vitals: [...newVitals, ...st.vitals],
          visits: st.visits.map((v) => v.id !== visit.id ? v : {
            ...v,
            status: 'submitted' as const,
            completedServices: completed,
            vitalsIds: newVitals.map((x) => x.id),
            patientReported: draft.patientReported,
            chwObservation: draft.chwObservation,
            actionTaken: draft.actionTaken,
            symptoms,
            medicationReminder: draft.medicationReminder,
            followUpRequired: draft.followUpRequired,
            presentPersons: draft.presentPersons,
            chwNotes: draft.notes,
            patientSummary,
            sponsorSummary,
            evidence: { ...v.evidence, exceptionReview: !v.evidence.plausibleDuration },
          }),
          assignments: st.assignments.map((a) => (a.id === visit.assignmentId ? { ...a, status: 'completed' as const } : a)),
          activeVisit: null,
        }));
        get().logAudit('Amina Bello', 'chw', 'visit.submitted', visit.id);
        // data-quality: abnormal without escalation
        const hasAbnormal = draft.vitals.some((v) => v.abnormal);
        if (hasAbnormal && !draft.escalationRaised) {
          set((st) => ({
            dqFlags: [{ id: uid('dq'), kind: 'abnormal_without_escalation' as const, description: `Abnormal reading at ${patient.name}'s visit without escalation.`, visitId: visit.id, status: 'open' as const, createdAt: nowIso() }, ...st.dqFlags],
          }));
        }
      },

      cancelActiveVisit: () => {
        const draft = get().activeVisit;
        if (!draft) return;
        set((s) => ({
          visits: s.visits.map((v) => (v.id === draft.visitId ? { ...v, status: 'scheduled' as const } : v)),
          activeVisit: null,
        }));
      },

      // ---------------------------------------------------------------- alerts
      acknowledgeAlert: (id) =>
        set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, status: 'acknowledged' as const } : a)) })),
      resolveAlert: (id) =>
        set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, status: 'resolved' as const } : a)) })),

      // ---------------------------------------------------------------- admin
      setChwStatus: (chwId, status) => {
        set((s) => ({
          chws: s.chws.map((c) => (c.id === chwId ? { ...c, status, available: status === 'approved' ? c.available : false } : c)),
        }));
        get().logAudit('Adaeze Okonkwo', 'admin', `chw.${status}`, chwId);
      },

      decideServiceRequest: (id, approve) => {
        const req = get().serviceRequests.find((r) => r.id === id);
        if (!req) return;
        set((s) => ({
          serviceRequests: s.serviceRequests.map((r) => (r.id === id ? { ...r, status: approve ? 'approved' as const : 'rejected' as const } : r)),
          chws: approve && req.kind === 'radius_change'
            ? s.chws.map((c) => (c.id === req.chwId ? { ...c, baseRadiusKm: c.baseRadiusKm + 3 } : c))
            : approve && req.kind === 'new_service'
              ? s.chws.map((c) => (c.id === req.chwId ? { ...c, approvedServices: Array.from(new Set([...c.approvedServices, 'medicine_delivery' as const])) } : c))
              : s.chws,
        }));
        get().logAudit('Adaeze Okonkwo', 'admin', approve ? 'request.approved' : 'request.rejected', id);
      },

      reassignPatient: (patientId, toChwId) => {
        set((s) => ({
          selectedChwByPatient: { ...s.selectedChwByPatient, [patientId]: toChwId },
          assignments: s.assignments.map((a) =>
            a.patientId === patientId && (a.status === 'offered' || a.status === 'accepted')
              ? { ...a, chwId: toChwId } : a),
          visits: s.visits.map((v) =>
            v.patientId === patientId && v.status === 'scheduled' ? { ...v, chwId: toChwId } : v),
        }));
        get().logAudit('Adaeze Okonkwo', 'admin', 'patient.reassigned', `${patientId} → ${toChwId}`);
      },

      reviewDqFlag: (id, outcome) =>
        set((s) => ({ dqFlags: s.dqFlags.map((f) => (f.id === id ? { ...f, status: outcome } : f)) })),

      toggleRateCardStatus: (id) =>
        set((s) => ({
          rateCards: s.rateCards.map((rc) => (rc.id === id ? { ...rc, status: rc.status === 'approved' ? 'pending' as const : 'approved' as const } : rc)),
        })),

      updateRateCardCharge: (id, baseCharge) => {
        set((s) => ({ rateCards: s.rateCards.map((rc) => (rc.id === id ? { ...rc, baseCharge } : rc)) }));
        get().logAudit('Adaeze Okonkwo', 'admin', 'ratecard.updated', id);
      },

      freezePayout: (visitId, frozen) =>
        set((s) => ({ visits: s.visits.map((v) => (v.id === visitId ? { ...v, payoutFrozen: frozen } : v)) })),

      // ---------------------------------------------------------------- integrations
      bookReferral: (patientId, kind, partner, description) => {
        set((s) => ({
          referrals: [{ id: uid('ref'), patientId, kind, partner, description, status: 'booked' as const, createdAt: nowIso(), simulated: true as const }, ...s.referrals],
        }));
        get().logAudit(ROLE_ACTOR[get().currentRole], get().currentRole, 'referral.booked', kind);
      },

      routeReferralToClinician: (id) => {
        const ref = get().referrals.find((r) => r.id === id);
        if (!ref) return;
        set((s) => ({
          referrals: s.referrals.map((r) => (r.id === id ? { ...r, status: 'routed_to_clinician' as const } : r)),
          clinicianCases: [{
            id: uid('case'), patientId: ref.patientId, title: `Flagged ${ref.kind} result — routed from ${ref.partner}`,
            chwObservation: 'Routed automatically by integration.', patientStatement: '',
            measuredReadings: [{ kind: ref.description, value: 'Flagged', unit: '', abnormal: true }],
            status: 'awaiting_review' as const, createdAt: nowIso(),
          }, ...s.clinicianCases],
        }));
      },

      // ---------------------------------------------------------------- clinician
      setClinicianAvailable: (available) => set({ clinicianAvailable: available }),

      reviewCase: (caseId, { recommendation, patientSummary, sponsorSummary, outcome }) => {
        const kase = get().clinicianCases.find((c) => c.id === caseId);
        if (!kase) return;
        set((s) => ({
          clinicianCases: s.clinicianCases.map((c) =>
            c.id === caseId ? {
              ...c, recommendation, patientSummary, sponsorSummary, reviewedAt: nowIso(),
              status: outcome === 'resolved' ? 'resolved' as const : 'more_info_requested' as const,
            } : c),
          alerts: outcome === 'resolved'
            ? s.alerts.map((a) => (a.id === kase.alertId ? { ...a, status: 'resolved' as const } : a))
            : s.alerts,
          escalations: outcome === 'resolved'
            ? s.escalations.map((e) => (e.id === kase.escalationId ? { ...e, status: 'resolved' as const } : e))
            : s.escalations,
        }));
        get().logAudit('Dr. Olumide Ajayi', 'clinician', outcome === 'resolved' ? 'case.resolved' : 'case.more_info', caseId);
      },
    }),
    {
      name: 'myndora-care-v1',
      partialize: (s) => {
        const { switchRole: _a, resetDemo: _b, ...rest } = s as Store;
        return rest;
      },
    },
  ),
);

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function useSelectedPatient() {
  return useStore((s) => s.patients.find((p) => p.id === s.selectedPatientId) ?? s.patients[0]);
}

export function useChw(id: string | undefined) {
  return useStore((s) => s.chws.find((c) => c.id === id));
}

export type { Assignment, Visit };
