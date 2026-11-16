import type { DemoConsultation } from "@/lib/demo-care";

export function DirectiveCard({ directive }: { directive: DemoConsultation | null }) {
  if (!directive || !directive.recommendationNotes) return null;
  const status = directive.status === "completed" ? "Resolved" : directive.status === "in_review" ? "In Review" : "Open";
  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="text-lg font-semibold">Clinician directive</h2>
      <p className="mt-2 font-semibold">{directive.followUpAction || "Follow-up not set"}</p>
      <p className="text-sm text-muted">
        {directive.followUpDate ? `Follow-up ${directive.followUpDate}` : "No follow-up date"} · {status}
      </p>
      <p className="mt-2 text-sm leading-6">{directive.recommendationNotes}</p>
    </section>
  );
}
