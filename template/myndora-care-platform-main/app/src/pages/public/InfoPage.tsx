// Generic public information page — same design system as the landing page.
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import PublicShell from './PublicShell';
import { Card } from '@/components/kit';

export type InfoSection =
  | { type: 'intro'; text: string }
  | { type: 'steps'; title: string; steps: { title: string; text: string }[] }
  | { type: 'cards'; title: string; cards: { title: string; text: string; badge?: string }[] }
  | { type: 'checklist'; title: string; items: string[] }
  | { type: 'notice'; title: string; text: string };

export default function InfoPage({
  title, subtitle, sections, cta,
}: {
  title: string;
  subtitle: string;
  sections: InfoSection[];
  cta?: { label: string; to: string }[];
}) {
  return (
    <PublicShell>
      <section className="mc-hero max-w-[1200px] mx-auto mt-6 md:mt-10 px-6 md:px-10 py-10 md:py-12" style={{ borderRadius: 24 }}>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight max-w-3xl">{title}</h1>
        <p className="mt-3 text-white/85 max-w-2xl text-sm md:text-base">{subtitle}</p>
        {cta && (
          <div className="mt-6 flex flex-wrap gap-2.5">
            {cta.map((c, i) => (
              <Link
                key={c.to + c.label}
                to={c.to}
                className={i === 0
                  ? 'mc-btn bg-white text-slate-900 font-bold px-5 py-2.5 rounded-xl hover:bg-slate-100'
                  : 'mc-btn border border-white/60 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-white/10'}
              >
                {c.label}
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="max-w-[1200px] mx-auto px-4 md:px-6 mt-8 mb-14 space-y-8">
        {sections.map((s, i) => {
          if (s.type === 'intro') {
            return <p key={i} className="text-sm md:text-base text-slate-600 max-w-3xl leading-relaxed">{s.text}</p>;
          }
          if (s.type === 'steps') {
            return (
              <section key={i}>
                <h2 className="mc-section-title mb-4">{s.title}</h2>
                <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {s.steps.map((st, n) => (
                    <Card key={st.title}>
                      <span className="w-8 h-8 rounded-full grid place-items-center text-sm font-extrabold text-white mb-2.5" style={{ background: 'var(--accent, var(--blue))' }}>{n + 1}</span>
                      <h3 className="font-extrabold text-slate-900 text-sm">{st.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{st.text}</p>
                    </Card>
                  ))}
                </ol>
              </section>
            );
          }
          if (s.type === 'cards') {
            return (
              <section key={i}>
                <h2 className="mc-section-title mb-4">{s.title}</h2>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {s.cards.map((c) => (
                    <Card key={c.title}>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-extrabold text-slate-900 text-sm">{c.title}</h3>
                        {c.badge && (
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.badge === 'Current' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{c.badge}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1.5">{c.text}</p>
                    </Card>
                  ))}
                </div>
              </section>
            );
          }
          if (s.type === 'checklist') {
            return (
              <section key={i}>
                <h2 className="mc-section-title mb-4">{s.title}</h2>
                <Card>
                  <ul className="grid gap-2.5 md:grid-cols-2">
                    {s.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            );
          }
          return (
            <section key={i} className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
              <h2 className="font-extrabold text-amber-900 text-sm uppercase tracking-wide">{s.title}</h2>
              <p className="text-sm text-amber-900 mt-1.5 max-w-3xl">{s.text}</p>
            </section>
          );
        })}
      </div>
    </PublicShell>
  );
}
