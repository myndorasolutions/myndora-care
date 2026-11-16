export type RiskLevel = "green" | "yellow" | "red";
export type GlucoseType = "fasting" | "random" | "none";

export const SYMPTOMS = [
  { id: "chest_pain", label: "Chest pain", urgent: true },
  { id: "breathing_difficulty", label: "Breathing difficulty", urgent: true },
  { id: "confusion", label: "Confusion", urgent: true },
  { id: "severe_headache", label: "Severe headache", urgent: true },
  { id: "dizziness", label: "Dizziness", urgent: false },
  { id: "unusual_weakness", label: "Unusual weakness", urgent: false },
] as const;

export type SymptomId = (typeof SYMPTOMS)[number]["id"];

export type ReadingInput = {
  systolic: number | null;
  diastolic: number | null;
  glucose: number | null;
  glucoseType: GlucoseType;
  symptoms: SymptomId[];
  medicationTaken: boolean | null;
};

export type RiskResult = {
  level: RiskLevel;
  explanation: string;
  nextStep: string;
};

export type RiskThresholds = {
  yellowSystolic: number;
  redSystolic: number;
  yellowDiastolic: number;
  redDiastolic: number;
  yellowFastingGlucose: number;
  redFastingGlucose: number;
  yellowRandomGlucose: number;
  redRandomGlucose: number;
};

export const DEFAULT_THRESHOLDS: RiskThresholds = {
  yellowSystolic: 140,
  redSystolic: 180,
  yellowDiastolic: 90,
  redDiastolic: 120,
  yellowFastingGlucose: 126,
  redFastingGlucose: 300,
  yellowRandomGlucose: 200,
  redRandomGlucose: 300,
};

const URGENT = new Set<SymptomId>([
  "chest_pain",
  "breathing_difficulty",
  "confusion",
  "severe_headache",
]);

let active: RiskThresholds = { ...DEFAULT_THRESHOLDS };

export function activeThresholds() {
  return active;
}

export function setActiveThresholds(next: RiskThresholds) {
  active = next;
}

export function classifyReading(input: ReadingInput, thresholds: RiskThresholds = active): RiskResult {
  const red: string[] = [];
  const yellow: string[] = [];
  const limits = thresholds;

  if (input.systolic != null && input.systolic >= limits.redSystolic) {
    red.push(`the top blood pressure number is ${limits.redSystolic} or higher`);
  } else if (input.systolic != null && input.systolic >= limits.yellowSystolic) {
    yellow.push(`the top blood pressure number is at least ${limits.yellowSystolic} and under ${limits.redSystolic}`);
  }

  if (input.diastolic != null && input.diastolic >= limits.redDiastolic) {
    red.push(`the bottom blood pressure number is ${limits.redDiastolic} or higher`);
  } else if (input.diastolic != null && input.diastolic >= limits.yellowDiastolic) {
    yellow.push(`the bottom blood pressure number is at least ${limits.yellowDiastolic} and under ${limits.redDiastolic}`);
  }

  if (input.glucoseType !== "none" && input.glucose != null) {
    if (input.glucoseType === "fasting" && input.glucose >= limits.redFastingGlucose) {
      red.push(`fasting blood sugar is ${limits.redFastingGlucose} mg/dL or higher`);
    } else if (input.glucoseType === "fasting" && input.glucose >= limits.yellowFastingGlucose) {
      yellow.push(`fasting blood sugar is at least ${limits.yellowFastingGlucose} mg/dL and under ${limits.redFastingGlucose}`);
    } else if (input.glucoseType === "random" && input.glucose >= limits.redRandomGlucose) {
      red.push(`random blood sugar is ${limits.redRandomGlucose} mg/dL or higher`);
    } else if (input.glucoseType === "random" && input.glucose >= limits.yellowRandomGlucose) {
      yellow.push(`random blood sugar is at least ${limits.yellowRandomGlucose} mg/dL and under ${limits.redRandomGlucose}`);
    }
  }

  for (const symptom of input.symptoms) {
    if (URGENT.has(symptom)) red.push(labelFor(symptom).toLowerCase());
    if (symptom === "dizziness" || symptom === "unusual_weakness") {
      yellow.push(labelFor(symptom).toLowerCase());
    }
  }

  if (input.medicationTaken === false) {
    yellow.push("medication was missed");
  }

  if (red.length > 0) {
    return {
      level: "red",
      explanation: `This reading is in the urgent range because ${joinReasons(red)}. This is not a diagnosis.`,
      nextStep: "Contact the care team now, or call the emergency contact if the person feels worse.",
    };
  }

  if (yellow.length > 0) {
    return {
      level: "yellow",
      explanation: `This reading needs a closer look because ${joinReasons(yellow)}. This is not a diagnosis.`,
      nextStep: "Recheck later today and tell the community health worker or clinician.",
    };
  }

  return {
    level: "green",
    explanation:
      "Blood pressure is under the caution range, blood sugar is in the usual range for the test type, and there are no concerning symptoms. This is not a diagnosis.",
    nextStep: "Keep the usual medication schedule and log the next reading on time.",
  };
}

export type VitalSummaryInput = {
  readingAt: string;
  systolic: number | null;
  diastolic: number | null;
  glucose: number | null;
  riskStatus: string;
};

export type VitalSummary = {
  days: number;
  count: number;
  systolicMin: number | null;
  systolicMax: number | null;
  glucoseMin: number | null;
  glucoseMax: number | null;
  yellowCount: number;
  redCount: number;
  narrative: string;
};

export function summarizeVitals(vitals: VitalSummaryInput[], days: number): VitalSummary {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = vitals.filter((row) => {
    const time = new Date(row.readingAt).getTime();
    return time >= cutoff && (row.systolic != null || row.glucose != null);
  });
  const systolic = rows.map((row) => row.systolic).filter((value): value is number => value != null);
  const glucose = rows.map((row) => row.glucose).filter((value): value is number => value != null);
  const latest = [...rows].sort((a, b) => b.readingAt.localeCompare(a.readingAt))[0];
  const yellowCount = rows.filter((row) => row.riskStatus === "yellow").length;
  const redCount = rows.filter((row) => row.riskStatus === "red").length;
  const systolicText = systolic.length ? `${Math.min(...systolic)}–${Math.max(...systolic)}` : "not recorded";
  const glucoseText = glucose.length ? `${Math.min(...glucose)}–${Math.max(...glucose)}` : "not recorded";
  const latestText = latest
    ? `${latest.systolic ?? "—"}/${latest.diastolic ?? "—"}${latest.glucose != null ? `, glucose ${latest.glucose}` : ""}`
    : "none";
  const narrative =
    rows.length === 0
      ? `No blood pressure or glucose readings in the last ${days} days.`
      : `${rows.length} readings in ${days} days. Latest ${latestText}. Systolic ${systolicText}. Glucose ${glucoseText}. ${redCount} urgent and ${yellowCount} caution readings.`;
  return {
    days,
    count: rows.length,
    systolicMin: systolic.length ? Math.min(...systolic) : null,
    systolicMax: systolic.length ? Math.max(...systolic) : null,
    glucoseMin: glucose.length ? Math.min(...glucose) : null,
    glucoseMax: glucose.length ? Math.max(...glucose) : null,
    yellowCount,
    redCount,
    narrative,
  };
}

function labelFor(id: SymptomId) {
  return SYMPTOMS.find((symptom) => symptom.id === id)?.label ?? id;
}

function joinReasons(reasons: string[]) {
  const unique = [...new Set(reasons)];
  if (unique.length === 1) return unique[0];
  return `${unique.slice(0, -1).join(", ")} and ${unique.at(-1)}`;
}
