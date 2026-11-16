import type { AppRole } from "@/lib/roles";

export type FixtureCard = {
  label: string;
  value: string;
  detail: string;
};

export type FixtureRow = {
  title: string;
  meta: string;
  status: string;
};

export type RoleFixture = {
  person: string;
  place: string;
  summary: string;
  cards: FixtureCard[];
  rows: FixtureRow[];
};

export const ROLE_FIXTURES: Record<AppRole, RoleFixture> = {
  patient: {
    person: "Grace Adeyemi",
    place: "Ilorin, Kwara",
    summary: "Self-sponsored patient on the Plus plan. You can also open the sponsor view for your own record.",
    cards: [
      { label: "Risk", value: "Yellow", detail: "Blood pressure needs a steady follow-up" },
      { label: "Last reading", value: "138/86", detail: "Yesterday morning, medication taken" },
      { label: "Plan", value: "Plus", detail: "₦500/day or ₦15,000/month, paid by you" },
      { label: "Dispute", value: "Open", detail: "Remote check marked complete while you were out" },
    ],
    rows: [
      { title: "CHW Amina Bello", meta: "Assigned in Tanke and GRA", status: "Verified" },
      { title: "Remote check", meta: "Yoruba audio prompt, two days ago", status: "Disputed" },
    ],
  },
  sponsor: {
    person: "Tunde Adeyemi",
    place: "Lagos",
    summary: "Approved sponsor for Baba Adeyemi. A self-sponsored patient sees this same billing view for their own care.",
    cards: [
      { label: "Linked patient", value: "Baba Adeyemi", detail: "Father, 74, Ilorin" },
      { label: "Consent", value: "Approved", detail: "You can see vitals, visits, and refills" },
      { label: "Risk", value: "Red", detail: "172/104 and random glucose 214" },
      { label: "Refill", value: "Requested", detail: "Amlodipine 5 mg at HealthPlus Tanke" },
    ],
    rows: [
      { title: "Family Care", meta: "₦1,000/day or ₦30,000/month for a household", status: "Available" },
      { title: "Clinician review", meta: "Dr. Chinedu Okafor, Abuja", status: "Open" },
    ],
  },
  chw: {
    person: "Amina Bello",
    place: "Ilorin",
    summary: "Community health extension worker covering Tanke and GRA.",
    cards: [
      { label: "Assigned patients", value: "2", detail: "Grace Adeyemi and Baba Adeyemi" },
      { label: "Completed visits", value: "42", detail: "Rating 4.8" },
      { label: "Today", value: "Red flag", detail: "Baba missed Amlodipine" },
      { label: "Languages", value: "Ha, Yo, En", detail: "Remote checks can use Yoruba prompts" },
    ],
    rows: [
      { title: "Grace Adeyemi", meta: "Remote check completed, now disputed", status: "Review" },
      { title: "Baba Adeyemi", meta: "172/104, glucose 214, medication not taken", status: "Red" },
    ],
  },
  pharmacy: {
    person: "HealthPlus Tanke Pharmacy",
    place: "Tanke, Ilorin",
    summary: "Local refill hub for assigned patients.",
    cards: [
      { label: "Queue", value: "1 request", detail: "Amlodipine 5 mg, once daily" },
      { label: "Patient", value: "Baba Adeyemi", detail: "Due in 5 days" },
      { label: "Status", value: "Requested", detail: "Waiting for pickup confirmation" },
      { label: "Hub badge", value: "Verified", detail: "Refill hub for Tanke" },
    ],
    rows: [
      { title: "Amlodipine 5 mg", meta: "Requested by the sponsor three hours ago", status: "Requested" },
    ],
  },
  clinician: {
    person: "Dr. Chinedu Okafor",
    place: "Abuja",
    summary: "Internal medicine review for escalated readings.",
    cards: [
      { label: "Open alert", value: "Red", detail: "Baba Adeyemi, assigned to you" },
      { label: "Reading", value: "172/104", detail: "Random glucose 214 mg/dL" },
      { label: "Consultation", value: "Open", detail: "Repeat vitals before changing treatment" },
      { label: "Follow-up", value: "2 days", detail: "CHW confirms the dose was taken" },
    ],
    rows: [
      { title: "Baba Adeyemi", meta: "Ilorin. Hypertension and type 2 diabetes.", status: "New" },
      { title: "Recommendation", meta: "Do not add a drug until the reading is confirmed.", status: "Draft" },
    ],
  },
  admin: {
    person: "Myndora Admin",
    place: "Operations",
    summary: "Operational access to profiles, assignments, disputes, and provider verification.",
    cards: [
      { label: "Demo people", value: "7", detail: "Patients, sponsor, CHW, pharmacy, clinician, staff" },
      { label: "Open dispute", value: "1", detail: "Grace Adeyemi challenged a remote check" },
      { label: "Red alerts", value: "1", detail: "Baba Adeyemi, assigned to Dr. Okafor" },
      { label: "Providers", value: "Verified", detail: "Amina, HealthPlus Tanke, Dr. Okafor" },
    ],
    rows: [
      { title: "Dispute", meta: "Visit was marked complete while Grace was at the market", status: "Open" },
      { title: "Assignments", meta: "Amina covers both Ilorin patients", status: "Active" },
    ],
  },
  super_admin: {
    person: "Myndora Super Admin",
    place: "Platform",
    summary: "Full operational access, including plans and the audit trail.",
    cards: [
      { label: "Basic Daily", value: "₦300", detail: "or ₦9,000 per month" },
      { label: "Plus", value: "₦500", detail: "or ₦15,000 per month" },
      { label: "Family Care", value: "₦1,000", detail: "or ₦30,000 per month" },
      { label: "Visit add-on", value: "Unset", detail: "Price is set before the add-on is sold" },
    ],
    rows: [
      { title: "audit_logs", meta: "dispute.opened by Grace Adeyemi", status: "Immutable" },
      { title: "Staff", meta: "Admin and super admin are not available on public signup", status: "Seeded" },
    ],
  },
};
