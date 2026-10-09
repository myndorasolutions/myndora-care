import {
  AlertSeverity,
  ChwActivationLevel,
  PricingZone,
  ServiceStatus,
  UserRole,
} from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEV_PASSWORD_HASH = 'dev-seed-hash';

const DEV_USERS = [
  {
    id: 'dev-sponsor',
    email: 'tunde.sponsor@myndora.demo',
    phoneNumber: '+234800000001',
    role: UserRole.SPONSOR,
    fullName: 'Tunde Adeyemi',
  },
  {
    id: 'dev-caregiver',
    email: 'tunde.caregiver@myndora.demo',
    phoneNumber: '+234800000002',
    role: UserRole.CAREGIVER,
    fullName: 'Tunde Adeyemi (Caregiver)',
  },
  {
    id: 'dev-chw',
    email: 'amina.chw@myndora.demo',
    phoneNumber: '+234800000003',
    role: UserRole.CHW,
    fullName: 'Amina Bello',
  },
  {
    id: 'dev-clinician',
    email: 'doctor@myndora.demo',
    phoneNumber: '+234800000004',
    role: UserRole.CLINICIAN_REVIEWER,
    fullName: 'Dr. Ibrahim Okonkwo',
  },
  {
    id: 'dev-admin',
    email: 'admin@myndora.demo',
    phoneNumber: '+234800000005',
    role: UserRole.ADMIN,
    fullName: 'Coordinator Admin',
  },
] as const;

const SPONSOR_ID = 'playtest-sponsor-tunde';
const PATIENT_ID = 'playtest-patient-grace';
const CHW_PROFILE_ID = 'playtest-chw-amina';

const AUDIO_PROMPTS = [
  {
    promptKey: 'WELL_BEING_CHECK',
    language: 'English',
    transcriptText: 'How are you feeling today compared to yesterday?',
  },
  {
    promptKey: 'WELL_BEING_CHECK',
    language: 'Yoruba',
    transcriptText: 'Bawo ni ara yin loni ti a ba fi we ti ana?',
  },
  {
    promptKey: 'MEDICATION_ADHERENCE',
    language: 'English',
    transcriptText: 'Have you taken your medication as prescribed today?',
  },
  {
    promptKey: 'MEDICATION_ADHERENCE',
    language: 'Yoruba',
    transcriptText: 'Nje e ti lo awon oogun yin loni bi dokita se so?',
  },
  {
    promptKey: 'NUTRITION_CHECK',
    language: 'English',
    transcriptText: 'Did you eat today?',
  },
  {
    promptKey: 'NUTRITION_CHECK',
    language: 'Yoruba',
    transcriptText: 'Nje e ti jeun loni?',
  },
  {
    promptKey: 'CARDIO_NEURO_CHECK',
    language: 'English',
    transcriptText:
      'Are you feeling any dizziness, weakness, or unusual tiredness?',
  },
  {
    promptKey: 'CARDIO_NEURO_CHECK',
    language: 'Yoruba',
    transcriptText:
      'Nje o n dabi pe oju yin n puyii, ara yin lo, tabi ore yin loni?',
  },
  {
    promptKey: 'URGENT_SCALATION_SCREEN',
    language: 'English',
    transcriptText:
      'Do you have chest pain, difficulty breathing, or a severe headache?',
  },
  {
    promptKey: 'URGENT_SCALATION_SCREEN',
    language: 'Yoruba',
    transcriptText:
      'Nje e n ni irora laya, isoro lati mi, tabi efo ori to lagbara?',
  },
] as const;

async function upsertAudioPrompts() {
  for (const prompt of AUDIO_PROMPTS) {
    const existing = await prisma.audioPrompt.findFirst({
      where: {
        promptKey: prompt.promptKey,
        language: prompt.language,
      },
    });

    if (existing) {
      await prisma.audioPrompt.update({
        where: { id: existing.id },
        data: {
          transcriptText: prompt.transcriptText,
          audioUrl: 'pending',
          isApproved: true,
        },
      });
    } else {
      await prisma.audioPrompt.create({
        data: {
          promptKey: prompt.promptKey,
          language: prompt.language,
          transcriptText: prompt.transcriptText,
          audioUrl: 'pending',
          isApproved: true,
        },
      });
    }
  }
}

async function main() {
  for (const user of DEV_USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: true,
      },
      create: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        passwordHash: DEV_PASSWORD_HASH,
        role: user.role,
        isVerified: true,
      },
    });
  }

  // Framework 2 Dual-Zone catalog
  const cities: { name: string; pricingZone: PricingZone }[] = [
    { name: 'Lagos', pricingZone: PricingZone.ZONE_A },
    { name: 'Abuja', pricingZone: PricingZone.ZONE_A },
    { name: 'Port Harcourt', pricingZone: PricingZone.ZONE_A },
    { name: 'Ilorin', pricingZone: PricingZone.ZONE_B },
    { name: 'Ibadan', pricingZone: PricingZone.ZONE_B },
    { name: 'Enugu', pricingZone: PricingZone.ZONE_B },
    { name: 'Kaduna', pricingZone: PricingZone.ZONE_B },
  ];
  for (const city of cities) {
    await prisma.serviceCity.upsert({
      where: { name: city.name },
      update: { pricingZone: city.pricingZone },
      create: {
        id: `city-${city.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: city.name,
        pricingZone: city.pricingZone,
      },
    });
  }

  const planDefs = [
    {
      planKey: 'basic_monitor',
      displayName: 'Basic Monitor',
      description: 'Self-tracking only (SaaS)',
      allocatedVisits: 0,
      zoneA: 3000,
      zoneB: 2500,
    },
    {
      planKey: 'family_care',
      displayName: 'Family Care Dashboard',
      description: 'Sponsor visibility + alerts',
      allocatedVisits: 0,
      zoneA: 9000,
      zoneB: 6000,
    },
    {
      planKey: 'assisted_care',
      displayName: 'Assisted Monitoring',
      description: 'Includes scheduled remote CHW checks',
      allocatedVisits: 2,
      zoneA: 18000,
      zoneB: 12000,
    },
    {
      planKey: 'premium_chronic',
      displayName: 'Premium Family Care',
      description: 'Weekly remote checks + clinician review',
      allocatedVisits: 4,
      zoneA: 45000,
      zoneB: 30000,
    },
  ] as const;

  for (const plan of planDefs) {
    const row = await prisma.subscriptionPlanCatalog.upsert({
      where: { planKey: plan.planKey },
      update: {
        displayName: plan.displayName,
        description: plan.description,
        allocatedVisits: plan.allocatedVisits,
      },
      create: {
        id: `plan-${plan.planKey}`,
        planKey: plan.planKey,
        displayName: plan.displayName,
        description: plan.description,
        allocatedVisits: plan.allocatedVisits,
      },
    });

    await prisma.planZonePrice.upsert({
      where: {
        planId_pricingZone: {
          planId: row.id,
          pricingZone: PricingZone.ZONE_A,
        },
      },
      update: { monthlyPriceNaira: plan.zoneA },
      create: {
        id: `price-${plan.planKey}-a`,
        planId: row.id,
        pricingZone: PricingZone.ZONE_A,
        monthlyPriceNaira: plan.zoneA,
      },
    });
    await prisma.planZonePrice.upsert({
      where: {
        planId_pricingZone: {
          planId: row.id,
          pricingZone: PricingZone.ZONE_B,
        },
      },
      update: { monthlyPriceNaira: plan.zoneB },
      create: {
        id: `price-${plan.planKey}-b`,
        planId: row.id,
        pricingZone: PricingZone.ZONE_B,
        monthlyPriceNaira: plan.zoneB,
      },
    });
  }

  await prisma.visitRate.upsert({
    where: { pricingZone: PricingZone.ZONE_A },
    update: {
      baseVisitNaira: 5500,
      chwPayoutNaira: 4000,
      platformFeeNaira: 1500,
      distanceSurchargePer2kmNaira: 800,
    },
    create: {
      id: 'visit-rate-zone-a',
      pricingZone: PricingZone.ZONE_A,
      baseVisitNaira: 5500,
      chwPayoutNaira: 4000,
      platformFeeNaira: 1500,
      distanceSurchargePer2kmNaira: 800,
    },
  });
  await prisma.visitRate.upsert({
    where: { pricingZone: PricingZone.ZONE_B },
    update: {
      baseVisitNaira: 3000,
      chwPayoutNaira: 2200,
      platformFeeNaira: 800,
      distanceSurchargePer2kmNaira: 500,
    },
    create: {
      id: 'visit-rate-zone-b',
      pricingZone: PricingZone.ZONE_B,
      baseVisitNaira: 3000,
      chwPayoutNaira: 2200,
      platformFeeNaira: 800,
      distanceSurchargePer2kmNaira: 500,
    },
  });

  await prisma.sponsor.upsert({
    where: { id: SPONSOR_ID },
    update: {
      fullName: 'Tunde Adeyemi',
      country: 'Nigeria',
      city: 'Ilorin',
      pricingZone: PricingZone.ZONE_B,
    },
    create: {
      id: SPONSOR_ID,
      userId: 'dev-sponsor',
      fullName: 'Tunde Adeyemi',
      country: 'Nigeria',
      city: 'Ilorin',
      pricingZone: PricingZone.ZONE_B,
      notificationPreference: 'ALL',
    },
  });

  await prisma.patient.upsert({
    where: { id: PATIENT_ID },
    update: {
      fullName: 'Grace Okafor',
      consentStatus: true,
      city: 'Ilorin',
      pricingZone: PricingZone.ZONE_B,
      phoneNumber: '+2348011110001',
      medications: ['Amlodipine 5mg'],
      caregiverDetails: {
        name: 'Tunde Adeyemi',
        phone: '+234800000002',
        address: '12 Unity Road, Ilorin West, Kwara',
      },
    },
    create: {
      id: PATIENT_ID,
      sponsorId: SPONSOR_ID,
      fullName: 'Grace Okafor',
      dateOfBirth: new Date('1968-03-15'),
      gender: 'female',
      address: '12 Unity Road, Ilorin West, Kwara',
      phoneNumber: '+2348011110001',
      city: 'Ilorin',
      pricingZone: PricingZone.ZONE_B,
      preferredLanguage: 'English',
      emergencyContact: {
        name: 'Tunde Adeyemi',
        phone: '+234800000002',
        relationship: 'son',
      },
      caregiverDetails: {
        name: 'Tunde Adeyemi',
        phone: '+234800000002',
        address: '12 Unity Road, Ilorin West, Kwara',
      },
      conditionTags: ['hypertension'],
      medications: ['Amlodipine 5mg'],
      consentStatus: true,
    },
  });

  const renewalDate = new Date();
  renewalDate.setDate(renewalDate.getDate() + 30);
  const existingSub = await prisma.subscription.findFirst({
    where: { sponsorId: SPONSOR_ID, planName: 'family_care' },
  });
  if (existingSub) {
    await prisma.subscription.update({
      where: { id: existingSub.id },
      data: {
        isActive: true,
        allocatedVisits: 4,
        usedVisits: 0,
        renewalDate,
      },
    });
  } else {
    await prisma.subscription.create({
      data: {
        sponsorId: SPONSOR_ID,
        planName: 'family_care',
        isActive: true,
        allocatedVisits: 4,
        usedVisits: 0,
        renewalDate,
      },
    });
  }

  await prisma.chwProfile.upsert({
    where: { id: CHW_PROFILE_ID },
    update: {
      activationLevel: ChwActivationLevel.HOME_VISIT_APPROVED,
      identityVerified: true,
      trainingCompleted: true,
    },
    create: {
      id: CHW_PROFILE_ID,
      userId: 'dev-chw',
      fullName: 'Amina Bello',
      ninStatus: true,
      identityVerified: true,
      referencesChecked: true,
      trainingCompleted: true,
      activationLevel: ChwActivationLevel.HOME_VISIT_APPROVED,
      serviceAreas: ['Ilorin West'],
      languagesSpoken: ['English', 'Yoruba'],
    },
  });

  const existingEscalation = await prisma.escalationCase.count({
    where: { isClosed: false },
  });

  if (existingEscalation === 0) {
    const visit = await prisma.physicalVisit.create({
      data: {
        sponsorId: SPONSOR_ID,
        patientId: PATIENT_ID,
        chwId: CHW_PROFILE_ID,
        scheduledTime: new Date(Date.now() - 86400000),
        actualStart: new Date(Date.now() - 86400000),
        actualEnd: new Date(Date.now() - 86300000),
        status: ServiceStatus.ESCALATED,
        checklistResponses: {
          medication_taken: true,
          symptoms_reported: 'headache',
        },
        systolicBp: 172,
        diastolicBp: 108,
        pulseRate: 88,
        chwAttestationSigned: true,
      },
    });

    const escalation = await prisma.escalationCase.create({
      data: {
        physicalVisitId: visit.id,
        triggerReason: 'BP 172/108 exceeds urgent threshold',
        severity: AlertSeverity.URGENT,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: 'dev-chw',
        action: 'ALERTS_TRIGGERED',
        entityName: 'EscalationCase',
        entityId: escalation.id,
        afterState: {
          escalationCaseId: escalation.id,
          physicalVisitId: visit.id,
          patientId: PATIENT_ID,
          sponsorId: SPONSOR_ID,
          severity: AlertSeverity.URGENT,
          triggerReason: 'BP 172/108 exceeds urgent threshold',
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: 'dev-chw',
        action: 'SPONSOR_DASHBOARD_NOTIFY',
        entityName: 'EscalationCase',
        entityId: escalation.id,
        afterState: {
          sponsorId: SPONSOR_ID,
          patientId: PATIENT_ID,
          physicalVisitId: visit.id,
          escalationCaseId: escalation.id,
          severity: AlertSeverity.URGENT,
          message: 'Urgent: BP 172/108 exceeds urgent threshold',
        },
      },
    });
  } else {
    console.log(
      `Escalation cases already seeded — skipping flagged visit (${existingEscalation} open).`,
    );
  }

  const scheduledVisitIds = [
    'playtest-visit-scheduled-am',
    'playtest-visit-scheduled-pm',
  ] as const;
  const scheduleOffsetsMs = [2 * 60 * 60 * 1000, 6 * 60 * 60 * 1000];
  for (let i = 0; i < scheduledVisitIds.length; i++) {
    const id = scheduledVisitIds[i];
    const scheduledTime = new Date(Date.now() + scheduleOffsetsMs[i]);
    await prisma.physicalVisit.upsert({
      where: { id },
      update: {
        status: ServiceStatus.SCHEDULED,
        scheduledTime,
        checklistResponses: { pending: true },
        systolicBp: null,
        diastolicBp: null,
        pulseRate: null,
        chwAttestationSigned: false,
        actualStart: null,
        actualEnd: null,
      },
      create: {
        id,
        sponsorId: SPONSOR_ID,
        patientId: PATIENT_ID,
        chwId: CHW_PROFILE_ID,
        scheduledTime,
        status: ServiceStatus.SCHEDULED,
        checklistResponses: { pending: true },
      },
    });
  }

  await upsertAudioPrompts();

  const userCount = await prisma.user.count();
  const patient = await prisma.patient.findUnique({ where: { id: PATIENT_ID } });
  const chw = await prisma.chwProfile.findUnique({ where: { id: CHW_PROFILE_ID } });
  const openEscalations = await prisma.escalationCase.count({
    where: { isClosed: false },
  });
  const audioPromptCount = await prisma.audioPrompt.count();

  if (!patient || !chw) {
    throw new Error('Seed validation failed: patient or CHW profile missing');
  }

  if (openEscalations === 0) {
    throw new Error('Seed validation failed: no open escalation cases');
  }

  if (audioPromptCount < AUDIO_PROMPTS.length) {
    throw new Error(
      `Seed validation failed: expected ${AUDIO_PROMPTS.length} audio prompts, found ${audioPromptCount}`,
    );
  }

  console.log('Seed complete:');
  console.log(`  users: ${userCount}`);
  console.log(`  patient: ${PATIENT_ID} (${patient.fullName})`);
  console.log(`  chw: ${CHW_PROFILE_ID} (${chw.activationLevel})`);
  console.log(`  open_escalations: ${openEscalations}`);
  console.log(`  audio_prompts: ${audioPromptCount}`);
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
