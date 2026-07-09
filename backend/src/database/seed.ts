import {
  ClinicalReviewStatus,
  ConditionType,
  ConsentStatus,
  RiskStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  UserRole,
  VitalSourceType,
} from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEV_USERS = [
  {
    id: 'dev-patient-grace',
    firebaseUid: 'dev-patient-grace',
    email: 'grace.patient@myndora.demo',
    phone: '+234800000001',
    role: UserRole.patient,
    fullName: 'Grace Okafor',
  },
  {
    id: 'dev-caregiver',
    firebaseUid: 'dev-caregiver',
    email: 'tunde.caregiver@myndora.demo',
    phone: '+234800000002',
    role: UserRole.caregiver,
    fullName: 'Tunde Adeyemi',
  },
  {
    id: 'dev-chw',
    firebaseUid: 'dev-chw',
    email: 'amina.chw@myndora.demo',
    phone: '+234800000003',
    role: UserRole.chw,
    fullName: 'Amina Bello',
  },
  {
    id: 'dev-clinician',
    firebaseUid: 'dev-clinician',
    email: 'doctor@myndora.demo',
    phone: '+234800000004',
    role: UserRole.clinician,
    fullName: 'Dr. Ibrahim Okonkwo',
  },
  {
    id: 'dev-admin',
    firebaseUid: 'dev-admin',
    email: 'admin@myndora.demo',
    phone: '+234800000005',
    role: UserRole.admin,
    fullName: 'Coordinator Admin',
  },
] as const;

const PATIENT_ID = 'playtest-patient-grace';

async function main() {
  for (const user of DEV_USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      create: user,
    });
  }

  await prisma.patient.upsert({
    where: { id: PATIENT_ID },
    update: {
      fullName: 'Grace Okafor',
      assignedChwId: 'dev-chw',
    },
    create: {
      id: PATIENT_ID,
      userId: 'dev-patient-grace',
      fullName: 'Grace Okafor',
      age: 58,
      gender: 'female',
      city: 'Ilorin',
      state: 'Kwara',
      lga: 'Ilorin West',
      conditions: [ConditionType.hypertension],
      emergencyContactName: 'Tunde Adeyemi',
      emergencyContactPhone: '+234800000002',
      emergencyRelationship: 'son',
      subscriptionPlan: SubscriptionPlan.family_care,
      subscriptionStatus: SubscriptionStatus.active,
      assignedChwId: 'dev-chw',
    },
  });

  await prisma.caregiverPatient.upsert({
    where: {
      caregiverUserId_patientId: {
        caregiverUserId: 'dev-caregiver',
        patientId: PATIENT_ID,
      },
    },
    update: { consentStatus: ConsentStatus.approved },
    create: {
      caregiverUserId: 'dev-caregiver',
      patientId: PATIENT_ID,
      consentStatus: ConsentStatus.approved,
      consentGrantedAt: new Date(),
      relationship: 'son',
    },
  });

  const existingVitals = await prisma.vital.count({
    where: { patientId: PATIENT_ID },
  });

  if (existingVitals === 0) {
    const now = Date.now();
    const samples = [
      { daysAgo: 14, systolic: 128, diastolic: 82, risk: RiskStatus.green },
      { daysAgo: 12, systolic: 132, diastolic: 86, risk: RiskStatus.yellow },
      { daysAgo: 10, systolic: 126, diastolic: 80, risk: RiskStatus.green },
      { daysAgo: 7, systolic: 138, diastolic: 88, risk: RiskStatus.yellow },
      { daysAgo: 5, systolic: 124, diastolic: 78, risk: RiskStatus.green },
      { daysAgo: 3, systolic: 148, diastolic: 94, risk: RiskStatus.yellow },
      { daysAgo: 1, systolic: 172, diastolic: 108, risk: RiskStatus.red },
    ];

    for (const sample of samples) {
      const createdAt = new Date(now - sample.daysAgo * 86400000);
      const vital = await prisma.vital.create({
        data: {
          patientId: PATIENT_ID,
          systolicBp: sample.systolic,
          diastolicBp: sample.diastolic,
          pulse: 72,
          riskStatus: sample.risk,
          sourceType: VitalSourceType.patient_self,
          capturedByUserId: 'dev-patient-grace',
          captureLocationType: 'home',
          clinicalReviewStatus:
            sample.risk === RiskStatus.red
              ? ClinicalReviewStatus.needs_review
              : sample.risk === RiskStatus.yellow
                ? ClinicalReviewStatus.needs_review
                : ClinicalReviewStatus.reviewed,
          createdAt,
        },
      });

      if (sample.daysAgo === 7) {
        await prisma.cHWVisit.create({
          data: {
            patientId: PATIENT_ID,
            chwId: 'dev-chw',
            visitType: 'routine',
            visitDate: createdAt,
            vitalsCaptured: true,
            vitalId: vital.id,
            notes: 'Routine home visit — vitals captured',
          },
        });
      }
    }
  } else {
    console.log(`Vitals already seeded for ${PATIENT_ID} — skipping (${existingVitals} existing).`);
  }

  const patient = await prisma.patient.findUnique({ where: { id: PATIENT_ID } });
  if (!patient) {
    throw new Error(`Seed validation failed: patient ${PATIENT_ID} not found`);
  }

  const userCount = await prisma.user.count();
  const vitalCount = await prisma.vital.count({ where: { patientId: PATIENT_ID } });
  const visitCount = await prisma.cHWVisit.count({ where: { patientId: PATIENT_ID } });

  if (vitalCount === 0) {
    throw new Error(`Seed validation failed: no vitals for patient ${PATIENT_ID}`);
  }

  console.log('Seed complete:');
  console.log(`  users: ${userCount}`);
  console.log(`  patient: ${PATIENT_ID} (${patient.fullName})`);
  console.log(`  vitals: ${vitalCount}`);
  console.log(`  chw_visits: ${visitCount}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
