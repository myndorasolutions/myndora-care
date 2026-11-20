import Link from "next/link";
import { Logo, ParentMark } from "@/components/brand/logo";
import { ROLE_LABEL, ROLES } from "@/lib/roles";
import { demoModeEnabled } from "@/lib/supabase/env";

const plans = [
  { name: "Basic Daily", daily: "₦300/day", monthly: "₦9,000/month", detail: "One person. Blood pressure and glucose follow-up." },
  { name: "Plus", daily: "₦500/day", monthly: "₦15,000/month", detail: "Remote checks and pharmacy refill requests." },
  { name: "Family Care", daily: "₦1,000/day", monthly: "₦30,000/month", detail: "A sponsor covers a household, including relatives." },
];

export default function HomePage() {
  const showDemo = demoModeEnabled();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-3 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-2 text-sm font-semibold">
          <Link href="/login" className="rounded-xl px-3 py-2 text-ink hover:bg-surface">
            Sign In
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-primary px-3 py-2 text-white"
          >
            Create account
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-8 sm:px-8">
        <section className="relative">
          <div className="pointer-events-none absolute -left-6 top-4 h-40 w-40 rounded-full bg-[#00A896]/25 blur-3xl" />
          <div className="pointer-events-none absolute -right-4 bottom-2 h-48 w-48 rounded-full bg-[#0B2545]/10 blur-3xl" />
          <div className="relative grid items-center gap-8 rounded-[2rem] bg-[#f7f4ef] px-5 py-8 sm:px-8 lg:grid-cols-2 lg:gap-10 lg:px-10 lg:py-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#0B2545]/70">
                Hypertension and diabetes care
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-[#0B2545] sm:text-4xl">
                Care that stays with the family, the CHW, and the local pharmacy.
              </h1>
              <p className="mt-4 text-base leading-7 text-[#334155]">
                Myndora Care coordinates daily readings, remote checks, refill pickup, and clinician review for people living in Nigeria.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Link href="/signup" className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-white">
                  Start as a patient or sponsor
                </Link>
                <Link href="/apply" className="rounded-xl bg-[#00A896] px-4 py-3 text-center text-sm font-semibold text-white">
                  Join as a Care Partner (CHW, Pharmacy, Clinician)
                </Link>
                <Link href="/login" className="rounded-xl border border-[#0B2545]/15 bg-white px-4 py-3 text-center text-sm font-semibold text-[#0B2545]">
                  I already have an account
                </Link>
              </div>
            </div>
            <div>
              <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_22px_50px_-24px_rgba(11,37,69,0.55)] ring-1 ring-white">
                <img
                  src="/images/hero-home-care.webp"
                  alt="A Myndora Care worker checks an older woman's blood pressure during a home visit."
                  width={1400}
                  height={781}
                  fetchPriority="high"
                  className="aspect-[3/2] w-full object-cover object-center"
                />
              </div>
              <p className="ml-auto mt-3 w-fit rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#0B2545] shadow-sm">
                Verified Home Visits • GPS & Timestamp Proof
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-card p-5">
          <h2 className="text-2xl font-semibold">Join as a Care Partner (CHW, Pharmacy, Clinician)</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Community health workers, pharmacies, and clinicians apply here. An admin reviews the application before a care dashboard opens.
          </p>
          <Link href="/apply" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white">
            Join as a Care Partner (CHW, Pharmacy, Clinician)
          </Link>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Plans</h2>
          <p className="mt-1 text-sm text-muted">Daily prices also have a monthly option. A physical visit is a separate add-on.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.name} className="rounded-2xl border border-line bg-card p-5">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-3 text-2xl font-semibold text-primary">{plan.daily}</p>
                <p className="text-sm text-muted">{plan.monthly}</p>
                <p className="mt-3 text-sm leading-6">{plan.detail}</p>
              </article>
            ))}
          </div>
        </section>

        {showDemo ? (
          <section className="rounded-2xl border border-line bg-card p-5">
            <h2 className="text-lg font-semibold">Preview the dashboards</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Demo mode opens every role with sample records. It does not read live patient data.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <Link
                  key={role}
                  href={`/api/demo-role?role=${role}`}
                  className="rounded-full border border-line bg-surface px-3 py-2 text-sm font-semibold"
                >
                  {ROLE_LABEL[role]}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-line px-4 py-6 text-sm sm:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <ParentMark />
          <Link href="/login" className="font-semibold text-primary">
            Care Team & Admin Sign In
          </Link>
        </div>
      </footer>
    </div>
  );
}
