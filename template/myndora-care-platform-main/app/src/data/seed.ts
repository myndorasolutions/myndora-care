// Seeded fictional demo data — no real user information.
import type {
  Account, PatientProfile, SponsorRelationship, CareSupporter, ConsentAuthorization,
  PackageSubscription, CHWProfile, CityRateCard, Assignment, Visit, VitalsReading,
  AlertItem, Escalation, Complaint, Rating, Referral, AuditEvent, ServiceRateRequest,
  DataQualityFlag, ClinicianCase, OfflineQueueItem, CHWServiceCatalogueEntry,
} from '@/types';

export const ACCOUNTS: Account[] = [
  { id: 'acc-sponsor', name: 'Tunde Adeyemi', role: 'sponsor', phone: '+234 803 000 1122', city: 'Lagos' },
  { id: 'acc-patient', name: 'Grace Okafor', role: 'patient', phone: '+234 806 000 3344', city: 'Ilorin' },
  { id: 'acc-chw', name: 'Amina Bello', role: 'chw', phone: '+234 809 000 5566', city: 'Ilorin' },
  { id: 'acc-admin', name: 'Adaeze Okonkwo', role: 'admin', phone: '+234 810 000 7788', city: 'Abuja' },
  { id: 'acc-clinician', name: 'Dr. Olumide Ajayi', role: 'clinician', phone: '+234 812 000 9900', city: 'Lagos' },
];

export const PATIENTS: PatientProfile[] = [
  {
    id: 'pat-grace', accountId: 'acc-patient', name: 'Grace Okafor', age: 67,
    relationToSponsor: 'Mother', city: 'Ilorin', neighbourhood: 'GRA',
    address: '14 Ahmadu Bello Way, GRA, Ilorin, Kwara State',
    conditions: ['Hypertension', 'Type 2 Diabetes'], languagePreference: 'English',
    genderPreference: 'female', locationConsentGiven: true,
  },
  {
    id: 'pat-ngozi', accountId: 'acc-ngozi', name: 'Ngozi Eze', age: 72,
    relationToSponsor: 'Aunt', city: 'Lagos', neighbourhood: 'Surulere',
    address: '8 Adeniran Ogunsanya St, Surulere, Lagos',
    conditions: ['Arthritis'], languagePreference: 'English',
    genderPreference: 'any', locationConsentGiven: false,
  },
  {
    id: 'pat-ibrahim', accountId: 'acc-ibrahim', name: 'Ibrahim Musa', age: 61,
    relationToSponsor: undefined, city: 'Abuja', neighbourhood: 'Wuse 2',
    address: '22 Aminu Kano Cres, Wuse 2, Abuja',
    conditions: ['Asthma'], languagePreference: 'Hausa',
    genderPreference: 'any', locationConsentGiven: true,
  },
  {
    id: 'pat-bola', accountId: 'acc-bola', name: 'Bola Adeyemi', age: 45,
    relationToSponsor: 'Sister', city: 'Lagos', neighbourhood: 'Ikeja',
    address: '5 Allen Avenue, Ikeja, Lagos',
    conditions: ['Hypertension'], languagePreference: 'English',
    genderPreference: 'female', locationConsentGiven: false,
  },
  {
    id: 'pat-kunle', accountId: 'acc-kunle', name: 'Kunle Okafor', age: 38,
    relationToSponsor: 'Son', city: 'Abuja', neighbourhood: 'Garki',
    address: '11 Olusegun Obasanjo Way, Garki, Abuja',
    conditions: ['Type 2 Diabetes'], languagePreference: 'English',
    genderPreference: 'any', locationConsentGiven: true,
  },
  {
    // The demo sponsor is also a Myndora patient himself — powers profile switching.
    id: 'pat-tunde', accountId: 'acc-sponsor', name: 'Tunde Adeyemi', age: 58,
    relationToSponsor: undefined, city: 'Lagos', neighbourhood: 'Lekki',
    address: '3 Admiralty Way, Lekki Phase 1, Lagos',
    conditions: ['Hypertension'], languagePreference: 'English',
    genderPreference: 'any', locationConsentGiven: true,
  },
];

export const SPONSOR_RELATIONSHIPS: SponsorRelationship[] = [
  { id: 'rel-1', sponsorAccountId: 'acc-sponsor', patientId: 'pat-grace', paysFor: true, accessLevel: 'full_monitoring' },
  { id: 'rel-2', sponsorAccountId: 'acc-sponsor', patientId: 'pat-ngozi', paysFor: true, accessLevel: 'payment_only' },
  { id: 'rel-bola', sponsorAccountId: 'acc-sponsor', patientId: 'pat-bola', paysFor: true, accessLevel: 'payment_only' },
  { id: 'rel-kunle', sponsorAccountId: 'acc-sponsor', patientId: 'pat-kunle', paysFor: true, accessLevel: 'payment_only' },
];

export const CARE_SUPPORTERS: CareSupporter[] = [
  { id: 'sup-1', name: 'Kunle Okafor', relationship: 'Son', patientId: 'pat-grace', accessLevel: 'important_alerts' },
];

export const CONSENTS: ConsentAuthorization[] = [
  {
    id: 'con-1', patientId: 'pat-grace', requesterName: 'Tunde Adeyemi', requesterAccountId: 'acc-sponsor',
    requestedLevel: 'full_monitoring', status: 'approved', grantedLevel: 'full_monitoring',
    createdAt: '2026-07-02T09:00:00', decidedAt: '2026-07-02T18:30:00', note: 'Approved by patient in app.',
  },
  {
    id: 'con-2', patientId: 'pat-ngozi', requesterName: 'Tunde Adeyemi', requesterAccountId: 'acc-sponsor',
    requestedLevel: 'full_monitoring', status: 'pending', createdAt: '2026-07-28T10:15:00',
    note: 'Awaiting patient decision.',
  },
];

export const SUBSCRIPTIONS: PackageSubscription[] = [
  {
    id: 'sub-grace', patientId: 'pat-grace', tier: 'assisted', status: 'active',
    nextBillingDate: '2026-08-15', addOns: ['lab_collection'],
  },
  {
    id: 'sub-ngozi', patientId: 'pat-ngozi', tier: 'family', status: 'active',
    nextBillingDate: '2026-08-20', addOns: [],
  },
  {
    id: 'sub-ibrahim', patientId: 'pat-ibrahim', tier: 'basic', status: 'active',
    nextBillingDate: '2026-08-22', addOns: [],
  },
  {
    id: 'sub-bola', patientId: 'pat-bola', tier: 'family', status: 'active',
    nextBillingDate: '2026-08-18', addOns: [],
  },
  {
    id: 'sub-kunle', patientId: 'pat-kunle', tier: 'basic', status: 'active',
    nextBillingDate: '2026-08-25', addOns: [],
  },
  {
    id: 'sub-tunde', patientId: 'pat-tunde', tier: 'basic', status: 'active',
    nextBillingDate: '2026-08-25', addOns: [],
  },
];

export const CHWS: CHWProfile[] = [
  {
    id: 'chw-amina', name: 'Amina Bello', cadre: 'CHEW', yearsExperience: 8,
    languages: ['English', 'Yoruba'], city: 'Ilorin', serviceArea: 'GRA & Tanke, Ilorin',
    baseRadiusKm: 8, distanceKm: 3.2, etaMinutes: 18, rating: 4.8, reviewCount: 42,
    completedVisits: 126, available: true, status: 'approved',
    approvedServices: ['remote_check', 'home_visit', 'wellbeing_call', 'lab_collection'],
    conditionTraining: ['Hypertension', 'Type 2 Diabetes'], reliabilityScore: 98,
    complaintCount: 0, workload: 3, photoVerified: true,
    verification: { nin: 'NIN-••••-4821', identityChecked: true, qualificationsChecked: true, referencesChecked: true, backgroundChecked: true, trainingCompleted: true },
  },
  {
    id: 'chw-funmi', name: 'Funmi Adeyemi', cadre: 'Registered Nurse', yearsExperience: 9,
    languages: ['English', 'Yoruba', 'Hausa'], city: 'Ilorin', serviceArea: 'GRA, Ilorin',
    baseRadiusKm: 10, distanceKm: 4.1, etaMinutes: 22, rating: 4.7, reviewCount: 35,
    completedVisits: 140, available: true, status: 'approved',
    approvedServices: ['remote_check', 'home_visit', 'wellbeing_call', 'lab_collection', 'medicine_delivery'],
    conditionTraining: ['Hypertension', 'Post-operative care'], reliabilityScore: 96,
    complaintCount: 1, workload: 4, photoVerified: true,
    verification: { nin: 'NIN-••••-7733', identityChecked: true, qualificationsChecked: true, referencesChecked: true, backgroundChecked: true, trainingCompleted: true },
  },
  {
    id: 'chw-rashidat', name: 'Rashidat Ibrahim', cadre: 'CHEW', yearsExperience: 4,
    languages: ['English', 'Yoruba'], city: 'Ilorin', serviceArea: 'Tanke & Oke-Odo, Ilorin',
    baseRadiusKm: 6, distanceKm: 4.7, etaMinutes: 24, rating: 4.6, reviewCount: 28,
    completedVisits: 89, available: true, status: 'approved',
    approvedServices: ['remote_check', 'home_visit', 'wellbeing_call'],
    conditionTraining: ['Type 2 Diabetes'], reliabilityScore: 93,
    complaintCount: 0, workload: 2, photoVerified: true,
    verification: { nin: 'NIN-••••-1190', identityChecked: true, qualificationsChecked: true, referencesChecked: true, backgroundChecked: true, trainingCompleted: true },
  },
  {
    id: 'chw-chidi', name: 'Chidi Nwosu', cadre: 'CHEW', yearsExperience: 3,
    languages: ['English', 'Igbo'], city: 'Lagos', serviceArea: 'Surulere, Lagos',
    baseRadiusKm: 5, distanceKm: 2.8, etaMinutes: 16, rating: 0, reviewCount: 0,
    completedVisits: 0, available: false, status: 'pending',
    approvedServices: [], conditionTraining: [], reliabilityScore: 0,
    complaintCount: 0, workload: 0, photoVerified: true,
    verification: { nin: 'NIN-••••-6642', identityChecked: true, qualificationsChecked: true, referencesChecked: false, backgroundChecked: true, trainingCompleted: false },
  },
];

export const CHW_CATALOGUE: CHWServiceCatalogueEntry[] = [
  { id: 'cat-1', chwId: 'chw-amina', service: 'home_visit', active: true, status: 'approved' },
  { id: 'cat-2', chwId: 'chw-amina', service: 'lab_collection', active: true, status: 'approved' },
  { id: 'cat-3', chwId: 'chw-amina', service: 'wellbeing_call', active: true, status: 'approved' },
];

const baseCard = {
  baseRadiusKm: 5,
  distanceBands: [
    { upToKm: 5, addFee: 0 },
    { upToKm: 10, addFee: 800 },
    { upToKm: 20, addFee: 1800 },
    { upToKm: 999, addFee: 3200 },
  ],
  travelTimeAdjustmentPct: 5,
  eveningAdjustmentPct: 10,
  weekendAdjustmentPct: 15,
  sameDayAdjustmentPct: 20,
  sameDayCap: 5000,
  chwTierMultiplier: 1.0,
  platformFeePct: 18,
  effectiveDate: '2026-07-01',
  status: 'approved' as const,
};

export const RATE_CARDS: CityRateCard[] = [
  { id: 'rc-ilorin-home', city: 'Ilorin', serviceType: 'home_visit', baseCharge: 4500, ...baseCard },
  { id: 'rc-ilorin-remote', city: 'Ilorin', serviceType: 'remote_check', baseCharge: 1800, ...baseCard, weekendAdjustmentPct: 10 },
  { id: 'rc-ilorin-lab', city: 'Ilorin', serviceType: 'lab_collection', baseCharge: 3000, ...baseCard },
  { id: 'rc-lagos-home', city: 'Lagos', serviceType: 'home_visit', baseCharge: 7000, ...baseCard, travelTimeAdjustmentPct: 12 },
  { id: 'rc-lagos-remote', city: 'Lagos', serviceType: 'remote_check', baseCharge: 2500, ...baseCard },
  { id: 'rc-abuja-home', city: 'Abuja', serviceType: 'home_visit', baseCharge: 6500, ...baseCard },
  { id: 'rc-abuja-remote', city: 'Abuja', serviceType: 'remote_check', baseCharge: 2200, ...baseCard },
  { id: 'rc-other-home', city: 'Other', serviceType: 'home_visit', baseCharge: 5000, ...baseCard, status: 'pending' },
];

export const ASSIGNMENTS: Assignment[] = [
  {
    id: 'asg-1', patientId: 'pat-grace', chwId: 'chw-amina', serviceType: 'home_visit',
    scheduledFor: '2026-08-03T10:00:00', status: 'accepted',
    payoutEstimate: 4500, travelComponent: 0, approximateArea: 'GRA area, Ilorin',
  },
  {
    id: 'asg-2', patientId: 'pat-grace', chwId: 'chw-amina', serviceType: 'remote_check',
    scheduledFor: '2026-08-05T09:00:00', status: 'offered',
    payoutEstimate: 1800, travelComponent: 0, approximateArea: 'GRA area, Ilorin',
  },
  {
    id: 'asg-3', patientId: 'pat-ibrahim', chwId: 'chw-funmi', serviceType: 'home_visit',
    scheduledFor: '2026-08-04T14:00:00', status: 'offered',
    payoutEstimate: 6500, travelComponent: 800, approximateArea: 'Wuse 2 area, Abuja',
  },
];

export const VITALS: VitalsReading[] = [
  {
    id: 'vit-1', patientId: 'pat-grace', visitId: 'visit-2', kind: 'blood_pressure',
    value: '185/105', unit: 'mmHg', recordedBy: 'chw', source: 'measured',
    deviceType: 'Omron M3 (BLE)', recordedAt: '2026-07-30T08:15:00', isAbnormal: true,
  },
  {
    id: 'vit-2', patientId: 'pat-grace', visitId: 'visit-2', kind: 'blood_pressure',
    value: '172/98', unit: 'mmHg', recordedBy: 'chw', source: 'measured',
    deviceType: 'Omron M3 (BLE)', recordedAt: '2026-07-30T08:22:00', isAbnormal: true, repeatOf: 'vit-1',
  },
  {
    id: 'vit-3', patientId: 'pat-grace', kind: 'blood_sugar', value: '7.8', unit: 'mmol/L',
    recordedBy: 'patient', source: 'patient_reported', deviceType: 'Self-entry',
    recordedAt: '2026-07-29T07:05:00', isAbnormal: false,
  },
  {
    id: 'vit-4', patientId: 'pat-grace', visitId: 'visit-1', kind: 'weight', value: '71.2', unit: 'kg',
    recordedBy: 'chw', source: 'measured', deviceType: 'Seca scale', recordedAt: '2026-07-27T10:20:00', isAbnormal: false,
  },
];

export const ESCALATIONS: Escalation[] = [
  {
    id: 'esc-1', patientId: 'pat-grace', visitId: 'visit-2', raisedBy: 'Amina Bello',
    reason: 'BP 185/105 mmHg with reported dizziness — urgent repeat and clinician routing.',
    status: 'routed_to_clinician', createdAt: '2026-07-30T08:30:00',
  },
];

export const VISITS: Visit[] = [
  {
    id: 'visit-1', patientId: 'pat-grace', chwId: 'chw-amina',
    scheduledFor: '2026-07-27T10:00:00', status: 'verified',
    requestedServices: ['Blood pressure check', 'Blood sugar check', 'Medication review', 'Wellbeing assessment'],
    completedServices: ['Blood pressure check', 'Blood sugar check', 'Medication review', 'Wellbeing assessment'],
    vitalsIds: ['vit-4'], patientReported: 'Felt well, sleeping better.',
    chwObservation: 'Patient alert and oriented. Good medication adherence.',
    actionTaken: 'Medication list reviewed, no changes.', symptoms: [],
    medicationReminder: 'Amlodipine 5mg — taken', followUpRequired: false,
    presentPersons: [{ name: 'Kunle Okafor', relationship: 'Son', consented: true }],
    verificationMethod: 'patient_otp',
    chwNotes: 'Routine monitoring visit completed without concerns.',
    patientSummary: 'Your monitoring visit was completed. All checks were normal.',
    sponsorSummary: 'Scheduled visit completed and verified. No concerns raised.',
    patientConfirmed: true, disputed: false, payoutFrozen: false,
    evidence: {
      geofenceCheckIn: '2026-07-27T09:58:00', geofenceCheckOut: '2026-07-27T10:40:00',
      serverCheckInTimestamp: '2026-07-27T09:58:04', serverCheckOutTimestamp: '2026-07-27T10:40:11',
      verificationMethod: 'patient_otp', otpVerified: true, patientAcknowledged: true,
      plausibleDuration: true, exceptionReview: false,
    },
  },
  {
    id: 'visit-2', patientId: 'pat-grace', chwId: 'chw-amina',
    scheduledFor: '2026-07-30T08:00:00', status: 'verified',
    requestedServices: ['Blood pressure check', 'Wellbeing assessment'],
    completedServices: ['Blood pressure check', 'Wellbeing assessment'],
    vitalsIds: ['vit-1', 'vit-2'], patientReported: 'Dizziness since early morning.',
    chwObservation: 'Patient appeared unsteady while standing. Repeat BP remained elevated.',
    actionTaken: 'Escalated for clinician review. Advised rest and hydration.',
    symptoms: ['Dizziness'], medicationReminder: 'Amlodipine 5mg — taken',
    followUpRequired: true, escalationId: 'esc-1',
    presentPersons: [], verificationMethod: 'patient_otp',
    chwNotes: 'Urgent escalation raised; repeat reading documented.',
    patientSummary: 'Your blood pressure was high at this visit. A clinician is reviewing it and we will follow up.',
    sponsorSummary: 'An urgent blood-pressure alert was raised at the latest visit and escalated for clinical review.',
    patientConfirmed: true, disputed: false, payoutFrozen: false,
    evidence: {
      geofenceCheckIn: '2026-07-30T07:58:00', geofenceCheckOut: '2026-07-30T08:44:00',
      serverCheckInTimestamp: '2026-07-30T07:58:02', serverCheckOutTimestamp: '2026-07-30T08:44:09',
      verificationMethod: 'patient_otp', otpVerified: true, patientAcknowledged: true,
      plausibleDuration: true, exceptionReview: false,
    },
  },
  {
    id: 'visit-3', assignmentId: 'asg-1', patientId: 'pat-grace', chwId: 'chw-amina',
    scheduledFor: '2026-08-03T10:00:00', status: 'scheduled',
    requestedServices: ['Blood pressure check', 'Blood sugar check', 'Medication review', 'Wellbeing assessment'],
    completedServices: [], vitalsIds: [], patientReported: '', chwObservation: '',
    actionTaken: '', symptoms: [], medicationReminder: '', followUpRequired: false,
    presentPersons: [], chwNotes: '', patientSummary: '', sponsorSummary: '',
    patientConfirmed: false, disputed: false, payoutFrozen: false,
    evidence: { otpVerified: false, patientAcknowledged: false, plausibleDuration: false, exceptionReview: false },
  },
];

export const ALERTS: AlertItem[] = [
  {
    id: 'alert-1', patientId: 'pat-grace', severity: 'urgent', status: 'escalated',
    title: 'Blood pressure concern',
    detail: 'BP 185/105 mmHg with dizziness reported. Repeat reading 172/98 mmHg. Escalated to clinician review.',
    createdAt: '2026-07-30T08:30:00', escalationId: 'esc-1',
  },
  {
    id: 'alert-2', patientId: 'pat-grace', severity: 'important', status: 'open',
    title: 'Missed evening medication check',
    detail: 'Evening Amlodipine confirmation not recorded by 21:00.',
    createdAt: '2026-07-29T21:05:00',
  },
  {
    id: 'alert-3', patientId: 'pat-ngozi', severity: 'info', status: 'acknowledged',
    title: 'Monthly summary ready',
    detail: 'May care summary is available for review.',
    createdAt: '2026-07-28T09:00:00',
  },
];

export const COMPLAINTS: Complaint[] = [
  {
    id: 'cmp-1', patientId: 'pat-grace', chwId: 'chw-funmi', raisedByRole: 'patient',
    raisedByName: 'Grace Okafor', type: 'late_arrival',
    details: 'CHW arrived 45 minutes late for a morning visit last week.',
    stage: 'owner_assigned', severity: 'medium', owner: 'Adaeze Okonkwo',
    createdAt: '2026-07-26T12:00:00',
    history: [
      { stage: 'submitted', at: '2026-07-26T12:00:00', note: 'Complaint submitted by patient.' },
      { stage: 'acknowledged', at: '2026-07-26T12:05:00', note: 'Auto-acknowledged.' },
      { stage: 'severity_assigned', at: '2026-07-26T14:00:00', note: 'Severity: medium.' },
      { stage: 'evidence_preserved', at: '2026-07-26T14:00:00', note: 'Visit timestamps preserved.' },
      { stage: 'owner_assigned', at: '2026-07-26T15:30:00', note: 'Assigned to Adaeze Okonkwo.' },
    ],
  },
  {
    id: 'cmp-2', patientId: 'pat-ibrahim', chwId: 'chw-chidi', raisedByRole: 'admin',
    raisedByName: 'Adaeze Okonkwo', type: 'safety_concern',
    details: 'Safety concern raised during onboarding spot-check. Direct matching suspended pending review.',
    stage: 'severity_assigned', severity: 'safety', owner: 'Adaeze Okonkwo',
    createdAt: '2026-07-29T09:00:00',
    history: [
      { stage: 'submitted', at: '2026-07-29T09:00:00', note: 'Raised by operations.' },
      { stage: 'acknowledged', at: '2026-07-29T09:01:00', note: 'Acknowledged.' },
      { stage: 'severity_assigned', at: '2026-07-29T09:10:00', note: 'Severity: safety. Matching suspended.' },
    ],
  },
];

export const RATINGS: Rating[] = [
  {
    id: 'rate-1', patientId: 'pat-grace', chwId: 'chw-amina', visitId: 'visit-1',
    stars: 5, comment: 'Amina was kind and thorough.', createdAt: '2026-07-27T12:00:00',
  },
];

export const REFERRALS: Referral[] = [
  {
    id: 'ref-1', patientId: 'pat-grace', kind: 'lab', partner: 'MediLab Diagnostics (simulated)',
    description: 'HbA1c + lipid panel — home sample collection',
    status: 'booked', createdAt: '2026-07-28T11:00:00', simulated: true,
  },
  {
    id: 'ref-2', patientId: 'pat-grace', kind: 'pharmacy', partner: 'CarePoint Pharmacy (simulated)',
    description: 'Amlodipine 5mg refill — home delivery',
    status: 'completed', createdAt: '2026-07-24T10:00:00', simulated: true,
  },
];

export const SERVICE_REQUESTS: ServiceRateRequest[] = [
  {
    id: 'srr-1', chwId: 'chw-amina', kind: 'add_on',
    description: 'Weekend home-visit add-on for Ilorin (within base radius).',
    status: 'pending', createdAt: '2026-07-29T08:00:00',
  },
  {
    id: 'srr-2', chwId: 'chw-funmi', kind: 'rate_change',
    description: 'Request to adjust evening remote-check rate for Ilorin (+8%).',
    status: 'pending', createdAt: '2026-07-28T16:00:00',
  },
  {
    id: 'srr-3', chwId: 'chw-rashidat', kind: 'radius_change',
    description: 'Request to extend base service radius from 6 km to 9 km (Tanke & Oke-Odo).',
    status: 'pending', createdAt: '2026-07-27T13:00:00',
  },
];

export const DQ_FLAGS: DataQualityFlag[] = [
  {
    id: 'dq-1', kind: 'impossible_travel', chwId: 'chw-funmi',
    description: 'Two check-ins 22 km apart recorded 9 minutes apart.',
    status: 'open', createdAt: '2026-07-29T18:00:00',
  },
  {
    id: 'dq-2', kind: 'abnormal_without_escalation', visitId: 'visit-2',
    description: 'Abnormal BP recorded without escalation in a previous draft (auto-resolved when esc-1 was raised).',
    status: 'open', createdAt: '2026-07-30T08:20:00',
  },
  {
    id: 'dq-3', kind: 'identical_readings', chwId: 'chw-rashidat',
    description: 'Identical BP values across three consecutive visits for different patients.',
    status: 'open', createdAt: '2026-07-30T07:00:00', 
  },
];

export const CLINICIAN_CASES: ClinicianCase[] = [
  {
    id: 'case-1', patientId: 'pat-grace', alertId: 'alert-1', escalationId: 'esc-1',
    title: 'Urgent BP escalation — Grace Okafor',
    chwObservation: 'Patient appeared unsteady while standing. Repeat BP remained elevated (172/98 mmHg).',
    patientStatement: 'Dizziness since early morning.',
    measuredReadings: [
      { kind: 'Blood pressure', value: '185/105', unit: 'mmHg', abnormal: true },
      { kind: 'Blood pressure (repeat)', value: '172/98', unit: 'mmHg', abnormal: true },
    ],
    status: 'awaiting_review', createdAt: '2026-07-30T08:35:00',
  },
  {
    id: 'case-2', patientId: 'pat-ngozi',
    title: 'Flagged lab result — Ngozi Eze',
    chwObservation: 'No CHW observation — routed automatically by lab integration.',
    patientStatement: 'Reports increased joint pain this week.',
    measuredReadings: [{ kind: 'Fasting glucose', value: '11.4', unit: 'mmol/L', abnormal: true }],
    status: 'awaiting_review', createdAt: '2026-07-29T15:00:00',
  },
];

export const AUDIT_EVENTS: AuditEvent[] = [
  { id: 'aud-1', actor: 'Amina Bello', actorRole: 'chw', action: 'visit.checked_in', target: 'visit-2', at: '2026-07-30T07:58:02' },
  { id: 'aud-2', actor: 'Amina Bello', actorRole: 'chw', action: 'escalation.raised', target: 'esc-1', at: '2026-07-30T08:30:00' },
  { id: 'aud-3', actor: 'Grace Okafor', actorRole: 'patient', action: 'consent.approved', target: 'con-1', at: '2026-07-02T18:30:00' },
  { id: 'aud-4', actor: 'Tunde Adeyemi', actorRole: 'sponsor', action: 'access.requested', target: 'con-2', at: '2026-07-28T10:15:00' },
  { id: 'aud-5', actor: 'Unknown device', actorRole: 'sponsor', action: 'access.unauthorized_attempt', target: 'pat-ibrahim records', at: '2026-07-29T23:41:00', flaggedUnusual: true },
];

export const OFFLINE_QUEUE: OfflineQueueItem[] = [
  { id: 'oq-1', kind: 'visit_record', description: 'Visit note draft — Ibrahim Musa wellbeing call', queuedAt: '2026-07-30T06:50:00', synced: false },
  { id: 'oq-2', kind: 'vitals', description: '1 queued vitals reading (poor network area)', queuedAt: '2026-07-30T07:10:00', synced: false },
];

export interface SeedData {
  accounts: Account[];
  patients: PatientProfile[];
  relationships: SponsorRelationship[];
  supporters: CareSupporter[];
  consents: ConsentAuthorization[];
  subscriptions: PackageSubscription[];
  chws: CHWProfile[];
  catalogue: CHWServiceCatalogueEntry[];
  rateCards: CityRateCard[];
  assignments: Assignment[];
  visits: Visit[];
  vitals: VitalsReading[];
  alerts: AlertItem[];
  escalations: Escalation[];
  complaints: Complaint[];
  ratings: Rating[];
  referrals: Referral[];
  serviceRequests: ServiceRateRequest[];
  dqFlags: DataQualityFlag[];
  clinicianCases: ClinicianCase[];
  auditEvents: AuditEvent[];
  offlineQueue: OfflineQueueItem[];
  selectedPatientId: string;
  selectedChwByPatient: Record<string, string>;
  blockedChws: Record<string, string[]>; // patientId -> chwIds
}

export function buildSeed(): SeedData {
  return structuredClone({
    accounts: ACCOUNTS,
    patients: PATIENTS,
    relationships: SPONSOR_RELATIONSHIPS,
    supporters: CARE_SUPPORTERS,
    consents: CONSENTS,
    subscriptions: SUBSCRIPTIONS,
    chws: CHWS,
    catalogue: CHW_CATALOGUE,
    rateCards: RATE_CARDS,
    assignments: ASSIGNMENTS,
    visits: VISITS,
    vitals: VITALS,
    alerts: ALERTS,
    escalations: ESCALATIONS,
    complaints: COMPLAINTS,
    ratings: RATINGS,
    referrals: REFERRALS,
    serviceRequests: SERVICE_REQUESTS,
    dqFlags: DQ_FLAGS,
    clinicianCases: CLINICIAN_CASES,
    auditEvents: AUDIT_EVENTS,
    offlineQueue: OFFLINE_QUEUE,
    selectedPatientId: 'pat-grace',
    selectedChwByPatient: { 'pat-grace': 'chw-amina', 'pat-ngozi': 'chw-chidi' },
    blockedChws: { 'pat-grace': [] },
  } satisfies SeedData);
}
