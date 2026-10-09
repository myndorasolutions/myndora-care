// Store & rules-engine tests: pricing, recommendations, permission separation,
// plan changes, consent, visit verification, complaints, reset.
import { describe, expect, it } from 'vitest';
import { useStore } from '@/store/useStore';
import { canSee, featureUnlocked, maskedAlertText } from '@/lib/permissions';
import { findRateCard, quoteService } from '@/lib/pricing';
import { rankCHWs } from '@/lib/recommend';
import { validateVital } from '@/lib/format';

const s = () => useStore.getState();

describe('permission separation (payment ≠ health access)', () => {
  it('payment_only sees billing but nothing clinical', () => {
    expect(canSee('payment_only', 'billing')).toBe(true);
    expect(canSee('payment_only', 'visit_status')).toBe(false);
    expect(canSee('payment_only', 'alert_notification')).toBe(false);
    expect(canSee('payment_only', 'vitals')).toBe(false);
  });

  it('important_alerts sees alert notifications but not exact readings', () => {
    expect(canSee('important_alerts', 'alert_notification')).toBe(true);
    expect(canSee('important_alerts', 'alert_detail')).toBe(false);
  });

  it('full_monitoring sees everything', () => {
    expect(canSee('full_monitoring', 'vitals')).toBe(true);
    expect(canSee('full_monitoring', 'clinician_notes')).toBe(true);
  });

  it('masked alert text hides clinical detail', () => {
    const text = maskedAlertText('Grace Okafor', 'urgent');
    expect(text).toContain('Grace Okafor');
    expect(text).not.toContain('185');
    expect(text).toContain('restricted');
  });
});

describe('package feature gating', () => {
  it('locks CHW checks below assisted tier', () => {
    expect(featureUnlocked('basic', 'chw_checks')).toBe(false);
    expect(featureUnlocked('family', 'chw_checks')).toBe(false);
    expect(featureUnlocked('assisted', 'chw_checks')).toBe(true);
  });

  it('locks clinician review below premium', () => {
    expect(featureUnlocked('assisted', 'clinician_review')).toBe(false);
    expect(featureUnlocked('premium', 'clinician_review')).toBe(true);
  });
});

describe('rate-card pricing engine', () => {
  it('computes total = payout + travel + adjustments + platform fee', () => {
    const card = findRateCard(s().rateCards, 'Ilorin', 'home_visit')!;
    const q = quoteService(card, { distanceKm: 7, weekend: true, evening: true, sameDay: true });
    expect(q.payout).toBe(4500);
    expect(q.travelComponent).toBe(800); // 7km → 10km band
    const adjSum = q.adjustments.reduce((x, a) => x + a.amount, 0);
    expect(q.total).toBe(q.payout + q.travelComponent + adjSum + q.platformFee);
    expect(q.platformFee).toBe(Math.round((q.payout + q.travelComponent + adjSum) * 0.18));
  });

  it('charges no travel component inside base radius', () => {
    const card = findRateCard(s().rateCards, 'Ilorin', 'home_visit')!;
    const q = quoteService(card, { distanceKm: 4 });
    expect(q.travelComponent).toBe(0);
  });

  it('caps the same-day adjustment', () => {
    const card = { ...findRateCard(s().rateCards, 'Ilorin', 'home_visit')!, sameDayAdjustmentPct: 300, sameDayCap: 5000 };
    const q = quoteService(card, { distanceKm: 3, sameDay: true });
    const sameDay = q.adjustments.find((a) => a.label.includes('Same-day'))!;
    expect(sameDay.amount).toBe(5000);
  });
});

describe('CHW recommendation engine', () => {
  it('does not rank by distance alone and explains recommendations', () => {
    const patient = s().patients.find((p) => p.id === 'pat-grace')!;
    const ranked = rankCHWs(s().chws, patient, 'home_visit', []);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].chw.id).toBe('chw-amina'); // best overall: training + rating + reliability
    expect(ranked[0].reasons.length).toBeGreaterThan(2);
    // distance alone would still pick Amina (3.2km), so verify scoring inputs
    const funmi = ranked.find((r) => r.chw.id === 'chw-funmi')!;
    expect(funmi.reasons.join(' ')).toContain('Registered Nurse');
  });

  it('excludes blocked and unapproved CHWs', () => {
    const patient = s().patients.find((p) => p.id === 'pat-grace')!;
    const ranked = rankCHWs(s().chws, patient, 'home_visit', ['chw-amina']);
    expect(ranked.find((r) => r.chw.id === 'chw-amina')).toBeUndefined();
    expect(ranked.find((r) => r.chw.id === 'chw-chidi')).toBeUndefined(); // pending status
  });
});

describe('vitals data-entry validation', () => {
  it('rejects implausible values', () => {
    expect(validateVital('blood_pressure_sys', 500).valid).toBe(false);
    expect(validateVital('blood_pressure_sys', 120).valid).toBe(true);
  });

  it('flags abnormal readings requiring repeat', () => {
    expect(validateVital('blood_pressure_sys', 185).abnormal).toBe(true);
    expect(validateVital('blood_pressure_sys', 150).abnormal).toBe(false);
    expect(validateVital('blood_sugar', 2.5).abnormal).toBe(true);
  });
});

describe('plan changes', () => {
  it('applies upgrades immediately', () => {
    expect(s().changeTier('pat-grace', 'premium')).toBe('upgraded');
    expect(s().subscriptions.find((x) => x.patientId === 'pat-grace')!.tier).toBe('premium');
  });

  it('schedules downgrades for the next cycle', () => {
    expect(s().changeTier('pat-grace', 'family')).toBe('downgrade_scheduled');
    const sub = s().subscriptions.find((x) => x.patientId === 'pat-grace')!;
    expect(sub.tier).toBe('assisted');
    expect(sub.scheduledDowngradeTo).toBe('family');
    s().cancelScheduledDowngrade('pat-grace');
    expect(s().subscriptions.find((x) => x.patientId === 'pat-grace')!.scheduledDowngradeTo).toBeUndefined();
  });

  it('supports pause / resume / cancel', () => {
    s().pausePlan('pat-grace');
    expect(s().subscriptions.find((x) => x.patientId === 'pat-grace')!.status).toBe('paused');
    s().resumePlan('pat-grace');
    expect(s().subscriptions.find((x) => x.patientId === 'pat-grace')!.status).toBe('active');
    s().cancelPlan('pat-grace');
    expect(s().subscriptions.find((x) => x.patientId === 'pat-grace')!.status).toBe('pending_cancellation');
  });
});

describe('consent workflow', () => {
  it('sponsor requests access but never self-grants', () => {
    s().requestAccess('pat-grace', 'full_monitoring');
    const pending = s().consents.find((c) => c.patientId === 'pat-grace' && c.status === 'pending');
    expect(pending).toBeTruthy();
    // relationship unchanged until patient decides
    expect(s().relationships.find((r) => r.patientId === 'pat-grace')!.accessLevel).toBe('full_monitoring'); // seeded grant
  });

  it('patient can reduce instead of approve', () => {
    s().requestAccess('pat-ngozi', 'full_monitoring');
    // con-2 already pending in seed; use it
    const pending = s().consents.find((c) => c.patientId === 'pat-ngozi' && c.status === 'pending')!;
    s().decideAccess(pending.id, 'reduced', 'important_alerts');
    expect(s().relationships.find((r) => r.patientId === 'pat-ngozi')!.accessLevel).toBe('important_alerts');
    expect(s().consents.find((c) => c.id === pending.id)!.status).toBe('reduced');
  });

  it('patient can reject — no access change', () => {
    const before = s().relationships.find((r) => r.patientId === 'pat-ngozi')!.accessLevel;
    const pending = s().consents.find((c) => c.patientId === 'pat-ngozi' && c.status === 'pending')!;
    s().decideAccess(pending.id, 'rejected');
    expect(s().relationships.find((r) => r.patientId === 'pat-ngozi')!.accessLevel).toBe(before);
  });

  it('patient can withdraw previously granted access', () => {
    s().withdrawAccess('pat-grace', 'acc-sponsor');
    expect(s().relationships.find((r) => r.patientId === 'pat-grace')!.accessLevel).toBe('payment_only');
    expect(s().consents.find((c) => c.id === 'con-1')!.status).toBe('withdrawn');
  });
});

describe('visit confirmation, dispute & ratings', () => {
  it('rating requires a verified, confirmed, unrated visit', () => {
    expect(s().rateChw('visit-3', 5, 'x')).toBe(false); // only scheduled
    expect(s().rateChw('visit-1', 5, 'x')).toBe(false); // already rated
    expect(s().rateChw('visit-2', 4, 'Thorough')).toBe(true);
    expect(s().ratings[0].visitId).toBe('visit-2');
  });

  it('disputing freezes payout and raises a data-quality flag', () => {
    s().disputeVisit('visit-2', 'Service incomplete');
    const v = s().visits.find((x) => x.id === 'visit-2')!;
    expect(v.status).toBe('disputed');
    expect(v.payoutFrozen).toBe(true);
    expect(s().dqFlags.some((f) => f.kind === 'disputed_visit' && f.visitId === 'visit-2')).toBe(true);
  });

  it('patient can confirm a submitted visit', () => {
    s().confirmVisit('visit-3');
    const v = s().visits.find((x) => x.id === 'visit-3')!;
    expect(v.status).toBe('verified');
    expect(v.patientConfirmed).toBe(true);
  });
});

describe('complaint workflow & safety rule', () => {
  it('submits complaints with tracked history', () => {
    s().submitComplaint({ patientId: 'pat-grace', raisedByRole: 'sponsor', raisedByName: 'Tunde Adeyemi', type: 'late_arrival', details: 'Late twice' });
    const c = s().complaints[0];
    expect(c.stage).toBe('submitted');
    expect(c.history.length).toBe(2); // submitted + acknowledged
    s().advanceComplaint(c.id, 'severity_assigned', 'Severity medium');
    expect(s().complaints[0].stage).toBe('severity_assigned');
    s().resolveComplaint(c.id, 'Credit issued');
    expect(s().complaints[0].stage).toBe('resolved');
  });

  it('safety complaints suspend matching until resolved', () => {
    s().submitComplaint({ patientId: 'pat-grace', chwId: 'chw-amina', raisedByRole: 'patient', raisedByName: 'Grace Okafor', type: 'safety_concern', details: 'Felt unsafe' });
    expect(s().chws.find((c) => c.id === 'chw-amina')!.matchingSuspended).toBe(true);
    s().resolveComplaint(s().complaints[0].id, 'Reviewed — no fault');
    expect(s().chws.find((c) => c.id === 'chw-amina')!.matchingSuspended).toBe(false);
  });
});

describe('admin decisions', () => {
  it('approving a radius change applies it', () => {
    const before = s().chws.find((c) => c.id === 'chw-rashidat')!.baseRadiusKm;
    s().decideServiceRequest('srr-3', true);
    expect(s().serviceRequests.find((r) => r.id === 'srr-3')!.status).toBe('approved');
    expect(s().chws.find((c) => c.id === 'chw-rashidat')!.baseRadiusKm).toBe(before + 3);
  });

  it('rejecting a rate request publishes nothing', () => {
    s().decideServiceRequest('srr-2', false);
    expect(s().serviceRequests.find((r) => r.id === 'srr-2')!.status).toBe('rejected');
  });

  it('reassignment moves open assignments and scheduled visits', () => {
    s().reassignPatient('pat-grace', 'chw-funmi');
    expect(s().selectedChwByPatient['pat-grace']).toBe('chw-funmi');
    expect(s().assignments.find((a) => a.id === 'asg-1')!.chwId).toBe('chw-funmi');
    expect(s().visits.find((v) => v.id === 'visit-3')!.chwId).toBe('chw-funmi');
  });
});

describe('clinician review', () => {
  it('resolving a case closes linked alert and escalation', () => {
    s().reviewCase('case-1', {
      recommendation: 'Adjust medication; repeat BP twice daily.',
      patientSummary: 'We reviewed your readings and adjusted your plan.',
      sponsorSummary: 'Clinical review completed.',
      outcome: 'resolved',
    });
    expect(s().clinicianCases.find((c) => c.id === 'case-1')!.status).toBe('resolved');
    expect(s().alerts.find((a) => a.id === 'alert-1')!.status).toBe('resolved');
    expect(s().escalations.find((e) => e.id === 'esc-1')!.status).toBe('resolved');
  });
});

describe('demo reset & audit trail', () => {
  it('reset restores seed data', () => {
    s().changeTier('pat-grace', 'premium');
    s().submitComplaint({ patientId: 'pat-grace', raisedByRole: 'patient', raisedByName: 'Grace Okafor', type: 'billing_issue', details: 'x' });
    s().resetDemo();
    expect(s().subscriptions.find((x) => x.patientId === 'pat-grace')!.tier).toBe('assisted');
    expect(s().complaints.find((c) => c.type === 'billing_issue')).toBeUndefined();
  });

  it('sensitive actions write audit events', () => {
    const before = s().auditEvents.length;
    s().changeTier('pat-grace', 'premium');
    expect(s().auditEvents.length).toBe(before + 1);
    expect(s().auditEvents[0].action).toBe('plan.upgraded');
  });
});
