import type { PilotRole } from './pilotData';
import type {
  AdminAlert,
  ConsultQueueItem,
  KpiMetric,
  LabOrder,
  PatientSummary,
  RefillRequest,
  RemoteCheckRow,
  RemoteCheckStat,
  RiskStatus,
  SponsorProfile,
  SyncQueueRow,
  UserProfile,
  VisitHistoryRow,
  VisitProofRow,
  VitalReading,
} from './types';

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

const patients: PatientSummary[] = [
  {
    id: 'p1',
    full_name: 'Grace Okafor',
    phone: '+2348012345678',
    risk_status: 'yellow',
    last_vital_at: '2026-05-14T08:00:00Z',
    conditions: ['Hypertension', 'Type 2 Diabetes'],
  },
  {
    id: 'p2',
    full_name: 'Musa Bello',
    phone: '+2348098765432',
    risk_status: 'green',
    last_vital_at: '2026-05-15T06:30:00Z',
    conditions: ['Hypertension'],
  },
  {
    id: 'p3',
    full_name: 'Esther Adeyemi',
    phone: '+2347011122233',
    risk_status: 'red',
    last_vital_at: '2026-05-15T07:15:00Z',
    conditions: ['Type 2 Diabetes'],
  },
];

function vitalsTrend(patientId: string, days: number): VitalReading[] {
  const base = patientId === 'p3' ? 150 : patientId === 'p1' ? 135 : 118;
  return Array.from({ length: Math.min(days, 14) }, (_, i) => ({
    id: `v-${patientId}-${i}`,
    recorded_at: new Date(Date.now() - i * 86400000).toISOString(),
    systolic_bp: base + Math.round(Math.sin(i) * 8),
    diastolic_bp: 75 + (i % 5),
    glucose_fasting: 95 + i * 2,
    pulse: 68 + (i % 8),
    risk_status: (['green', 'yellow', 'red'] as RiskStatus[])[i % 3],
  })).reverse();
}

const pilotRoleMap: Record<
  PilotRole,
  { email: string; full_name: string; role: UserProfile['role'] }
> = {
  chw: { email: 'chw@myndora.demo', full_name: 'Amina Bello', role: 'chw' },
  sponsor: { email: 'sponsor@myndora.demo', full_name: 'Tunde Okafor', role: 'sponsor' },
  coordinator: {
    email: 'coordinator@myndora.demo',
    full_name: 'Care Coordinator',
    role: 'admin',
  },
};

export const mockApi = {
  async loginWithPilotRole(
    pilotRole: PilotRole,
  ): Promise<{ token: string; user: UserProfile }> {
    await delay();
    const profile = pilotRoleMap[pilotRole];
    return {
      token: `mock-jwt-${profile.role}`,
      user: {
        id: `u-${pilotRole}`,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
      },
    };
  },

  async login(email: string, _password: string): Promise<{ token: string; user: UserProfile }> {
    await delay();
    const roleMap: Record<string, UserProfile['role']> = {
      'pharmacy@myndora.demo': 'pharmacy',
      'doctor@myndora.demo': 'clinician',
      'lab@myndora.demo': 'lab',
      'admin@myndora.demo': 'admin',
      'superadmin@myndora.demo': 'super_admin',
      'tunde.caregiver@myndora.demo': 'caregiver',
      'grace.patient@myndora.demo': 'patient',
    };
    const role = roleMap[email] ?? 'admin';
    return {
      token: `mock-jwt-${role}`,
      user: {
        id: `u-${role}`,
        email,
        full_name: email.split('@')[0].replace(/\./g, ' '),
        role,
      },
    };
  },

  async getPatients(): Promise<PatientSummary[]> {
    await delay();
    return patients;
  },

  async getVitalsTrend(patientId: string, days = 7): Promise<VitalReading[]> {
    await delay();
    return vitalsTrend(patientId, days);
  },

  async getPharmacyDashboard() {
    await delay();
    return {
      pending_refills: 12,
      walk_ins_today: 8,
      dispensed_today: 24,
      revenue_naira: 185000,
    };
  },

  async getRefillQueue(): Promise<RefillRequest[]> {
    await delay();
    return [
      {
        id: 'r1',
        patient_name: 'Grace Okafor',
        medication: 'Amlodipine 5mg',
        status: 'pending',
        requested_at: '2026-05-15T09:00:00Z',
      },
      {
        id: 'r2',
        patient_name: 'Musa Bello',
        medication: 'Metformin 500mg',
        status: 'ready',
        requested_at: '2026-05-15T08:30:00Z',
      },
    ];
  },

  async getClinicianQueue(): Promise<ConsultQueueItem[]> {
    await delay();
    return [
      {
        id: 'c1',
        patient_name: 'Esther Adeyemi',
        reason: 'Elevated BP follow-up',
        risk_status: 'red',
        wait_minutes: 12,
      },
      {
        id: 'c2',
        patient_name: 'Grace Okafor',
        reason: 'Diabetes review',
        risk_status: 'yellow',
        wait_minutes: 25,
      },
    ];
  },

  async getLabOrders(): Promise<LabOrder[]> {
    await delay();
    return [
      {
        id: 'lo1',
        patient_name: 'Grace Okafor',
        tests: ['HbA1c', 'Lipid panel'],
        status: 'pending',
        ordered_at: '2026-05-15T07:00:00Z',
      },
      {
        id: 'lo2',
        patient_name: 'Musa Bello',
        tests: ['Fasting glucose'],
        status: 'in_progress',
        ordered_at: '2026-05-14T14:00:00Z',
      },
    ];
  },

  async getAdminKpis(): Promise<KpiMetric[]> {
    await delay();
    return [
      { label: 'Active patients', value: 1248, change: '+4.2%', trend: 'up' },
      { label: 'Red alerts (24h)', value: 7, change: '-12%', trend: 'down' },
      { label: 'Remote checks today', value: 42, change: '+6', trend: 'up' },
      { label: 'Sponsored plans', value: 318, change: '+3.1%', trend: 'up' },
    ];
  },

  async getSponsorProfiles(): Promise<SponsorProfile[]> {
    await delay();
    return [
      {
        id: 'sp-1',
        sponsor_name: 'Tunde Okafor',
        patient_name: 'Grace Okafor',
        plan: 'Family Care Plus',
        status: 'active',
        country_location: 'United Kingdom',
        payment_status: 'paid',
        expires_at: '2026-08-01T00:00:00Z',
      },
      {
        id: 'sp-2',
        sponsor_name: 'Musa Bello Jr.',
        patient_name: 'Musa Bello',
        plan: 'Basic Monitor',
        status: 'trial',
        country_location: 'United States',
        payment_status: 'trial',
        expires_at: '2026-06-30T00:00:00Z',
      },
      {
        id: 'sp-3',
        sponsor_name: 'Esther Adeyemi Family',
        patient_name: 'Esther Adeyemi',
        plan: 'Assisted Care',
        status: 'active',
        country_location: 'Nigeria',
        payment_status: 'pending',
        expires_at: '2026-09-15T00:00:00Z',
      },
    ];
  },

  async getRemoteCheckStats(): Promise<RemoteCheckStat[]> {
    await delay();
    return [
      { label: 'Today', value: 42 },
      { label: 'This week', value: 286 },
      { label: 'Pending review', value: 5 },
      { label: 'Short-call warnings', value: 2 },
    ];
  },

  async getRemoteCheckRows(): Promise<RemoteCheckRow[]> {
    await delay();
    return [
      {
        id: 'rc-1',
        patient_name: 'Grace Okafor',
        last_check_at: new Date().toISOString(),
        systolic_bp: 132,
        diastolic_bp: 84,
        status: 'yellow',
        medication_adherence: 'partial',
        symptom_check: 'mild',
        short_call_warning: true,
      },
      {
        id: 'rc-2',
        patient_name: 'Musa Bello',
        last_check_at: new Date(Date.now() - 3600000).toISOString(),
        systolic_bp: 118,
        diastolic_bp: 76,
        status: 'green',
        medication_adherence: 'yes',
        symptom_check: 'clear',
        short_call_warning: false,
      },
      {
        id: 'rc-3',
        patient_name: 'Esther Adeyemi',
        last_check_at: new Date(Date.now() - 7200000).toISOString(),
        systolic_bp: 158,
        diastolic_bp: 96,
        status: 'red',
        medication_adherence: 'no',
        symptom_check: 'concerning',
        short_call_warning: true,
      },
    ];
  },

  async getVisitProofRows(): Promise<VisitProofRow[]> {
    await delay();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();
    const now = new Date().toISOString();
    return [
      {
        id: 'vp-1',
        patient_name: 'Grace Okafor',
        chw_name: 'Amina Bello',
        visit_date: yesterday,
        verification_method: 'Signature',
        proof_status: 'confirmed',
        systolic_bp: 128,
        diastolic_bp: 82,
        pulse: 72,
        recorded_at: yesterday,
        signature_state: 'captured',
        otp_state: 'n/a',
      },
      {
        id: 'vp-2',
        patient_name: 'Esther Adeyemi',
        chw_name: 'Amina Bello',
        visit_date: twoDaysAgo,
        verification_method: 'OTP',
        proof_status: 'confirmed',
        systolic_bp: 145,
        diastolic_bp: 90,
        pulse: 78,
        recorded_at: twoDaysAgo,
        signature_state: 'n/a',
        otp_state: 'confirmed',
      },
      {
        id: 'vp-3',
        patient_name: 'Musa Bello',
        chw_name: 'Chidi Nwosu',
        visit_date: now,
        verification_method: 'OTP',
        proof_status: 'pending',
        systolic_bp: 120,
        diastolic_bp: 78,
        pulse: 70,
        recorded_at: now,
        signature_state: 'n/a',
        otp_state: 'pending',
      },
    ];
  },

  async getSyncQueueRows(): Promise<SyncQueueRow[]> {
    await delay();
    return [
      {
        id: 'sq-1',
        patient_name: 'Grace Okafor',
        recorded_at: new Date(Date.now() - 1800000).toISOString(),
        status: 'pending',
        detail: 'Vitals awaiting upload from CHW device',
      },
      {
        id: 'sq-2',
        patient_name: 'Esther Adeyemi',
        recorded_at: new Date(Date.now() - 7200000).toISOString(),
        status: 'failed',
        detail: 'Network timeout during sync',
      },
      {
        id: 'sq-3',
        patient_name: 'Musa Bello',
        recorded_at: new Date(Date.now() - 3600000).toISOString(),
        status: 'unconfirmed',
        detail: 'OTP proof disputed by sponsor',
      },
    ];
  },

  async getVisitHistory(): Promise<VisitHistoryRow[]> {
    await delay();
    return [
      {
        id: 'vh-1',
        patient_name: 'Grace Okafor',
        visit_date: new Date(Date.now() - 86400000).toISOString(),
        chw_name: 'Amina Bello',
        verification_method: 'Signature',
      },
      {
        id: 'vh-2',
        patient_name: 'Esther Adeyemi',
        visit_date: new Date(Date.now() - 172800000).toISOString(),
        chw_name: 'Amina Bello',
        verification_method: 'OTP',
      },
    ];
  },

  async getAdminAlerts(): Promise<AdminAlert[]> {
    await delay();
    return [
      {
        id: 'a1',
        patient_name: 'Esther Adeyemi',
        message: 'Systolic BP 168 — threshold exceeded',
        risk_status: 'red',
        created_at: new Date().toISOString(),
      },
      {
        id: 'a2',
        patient_name: 'Grace Okafor',
        message: 'Missed medication check-in',
        risk_status: 'yellow',
        created_at: new Date(Date.now() - 300000).toISOString(),
      },
    ];
  },

  async getFeatureFlags() {
    await delay();
    return [
      { key: 'FEATURE_AI_SUMMARIES', enabled: false, description: 'AI consultation summaries' },
      { key: 'FEATURE_PAYSTACK_LIVE', enabled: false, description: 'Live Paystack payments' },
      { key: 'FEATURE_USSD', enabled: true, description: 'USSD vitals capture' },
      { key: 'FEATURE_MARKETPLACE', enabled: false, description: 'Service marketplace' },
    ];
  },

  async getEarnings(role: string) {
    await delay();
    return {
      period: 'May 2026',
      gross_naira: role === 'pharmacy' ? 420000 : 680000,
      commission_naira: role === 'pharmacy' ? 21000 : 136000,
      pending_payout_naira: 45000,
      transactions: [
        { id: 't1', date: '2026-05-14', description: 'Refill dispensed', amount: 8500 },
        { id: 't2', date: '2026-05-13', description: 'Consultation fee', amount: 15000 },
      ],
    };
  },
};
