// CHW recommendation engine — never ranked by distance alone.
import type { CHWProfile, PatientProfile, ServiceType } from '@/types';

export interface RankedCHW {
  chw: CHWProfile;
  score: number;
  reasons: string[];
  concerns: string[];
}

export function rankCHWs(chws: CHWProfile[], patient: PatientProfile, service: ServiceType, blockedIds: string[] = []): RankedCHW[] {
  const candidates = chws.filter(
    (c) => c.status === 'approved' && c.available && !blockedIds.includes(c.id),
  );

  const ranked = candidates.map((chw) => {
    let score = 0;
    const reasons: string[] = [];
    const concerns: string[] = [];

    // Qualification & approved service scope
    if (chw.approvedServices.includes(service)) {
      score += 25;
      reasons.push(`Approved for ${service.replace('_', ' ')}`);
    } else {
      concerns.push('Service not in approved scope');
      score -= 40;
    }
    if (chw.cadre === 'Registered Nurse') {
      score += 6;
      reasons.push('Registered Nurse qualification');
    }

    // Location & travel
    if (chw.city === patient.city) {
      score += 15;
      reasons.push(`Based in ${patient.city}`);
    } else {
      concerns.push(`Based in ${chw.city}, outside patient city`);
      score -= 25;
    }
    if (chw.etaMinutes <= 20) { score += 8; reasons.push(`Fast estimated arrival (~${chw.etaMinutes} min)`); }
    else if (chw.etaMinutes <= 30) { score += 4; }
    if (chw.distanceKm <= chw.baseRadiusKm) {
      score += 6;
      reasons.push('Within base service radius — no distance add-on');
    } else {
      concerns.push('Outside base radius — distance add-on applies');
    }

    // Language
    if (chw.languages.includes(patient.languagePreference)) {
      score += 8;
      reasons.push(`Speaks ${patient.languagePreference}`);
    }

    // Gender preference
    if (patient.genderPreference === 'female') {
      // Seed CHWs are female; treat as satisfied unless known otherwise
      score += 5;
      reasons.push('Matches female CHW preference');
    }

    // Condition-specific training
    const trained = patient.conditions.filter((c) => chw.conditionTraining.includes(c));
    if (trained.length > 0) {
      score += 10 * trained.length;
      reasons.push(`Trained in ${trained.join(', ')}`);
    }

    // Rating & verified history
    if (chw.rating >= 4.7) { score += 10; reasons.push(`Highly rated (${chw.rating}★ from verified visits)`); }
    else if (chw.rating >= 4.5) { score += 6; reasons.push(`Well rated (${chw.rating}★)`); }
    if (chw.completedVisits >= 100) { score += 6; reasons.push(`${chw.completedVisits} verified completed visits`); }

    // Reliability & complaints
    if (chw.reliabilityScore >= 95) { score += 6; reasons.push('Excellent reliability record'); }
    if (chw.complaintCount > 0) { score -= 8 * chw.complaintCount; concerns.push(`${chw.complaintCount} past complaint(s)`); }

    // Workload
    if (chw.workload <= 3) { score += 4; reasons.push('Low current workload'); }
    else if (chw.workload >= 6) { score -= 6; concerns.push('High current workload'); }

    return { chw, score, reasons, concerns };
  });

  return ranked.sort((a, b) => b.score - a.score);
}
