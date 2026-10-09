// Admin Package Availability: which packages are sellable per city, and coverage context.
import type { City } from '@/types';
import { PACKAGES } from '@/lib/permissions';
import { useStore } from '@/store/useStore';
import { useToast } from '@/store/ui';
import { Badge, Card, PageHeader, Toggle } from '@/components/kit';

const CITIES: City[] = ['Lagos', 'Ilorin', 'Abuja', 'Other'];

export default function AdminPackageAvailability() {
  const availability = useStore((s) => s.packageAvailability);
  const togglePackageCity = useStore((s) => s.togglePackageCity);
  const subscriptions = useStore((s) => s.subscriptions);
  const patients = useStore((s) => s.patients);
  const chws = useStore((s) => s.chws);
  const { toast } = useToast();

  const activeSubsIn = (city: City, tier: string) =>
    subscriptions.filter((s) => s.status === 'active' && s.tier === tier && patients.find((p) => p.id === s.patientId)?.city === city).length;
  const approvedChwsIn = (city: City) => chws.filter((c) => c.city === city && c.status === 'approved').length;

  return (
    <div>
      <PageHeader title="Package Availability" subtitle="Which packages can be sold in each city. Turning a tier off stops new subscriptions; existing subscribers keep their plan." />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500 border-b border-slate-200">
                <th className="py-2.5 pr-4">Package</th>
                {CITIES.map((c) => <th key={c} className="py-2.5 pr-4">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {PACKAGES.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4">
                    <p className="font-bold text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.tagline}</p>
                  </td>
                  {CITIES.map((c) => {
                    const on = availability[c].includes(p.id);
                    const subs = activeSubsIn(c, p.id);
                    return (
                      <td key={c} className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Toggle checked={on} onChange={() => { togglePackageCity(c, p.id); toast(`${p.name} ${on ? 'disabled' : 'enabled'} in ${c}`); }} label={`${p.name} in ${c}`} />
                          <span className="text-xs text-slate-500">{on ? <Badge tone="green">on</Badge> : <Badge tone="gray">off</Badge>}{subs > 0 ? ` · ${subs} active` : ''}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">CHW coverage context</p>
        <div className="grid sm:grid-cols-4 gap-3">
          {CITIES.map((c) => (
            <div key={c} className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-bold text-slate-900">{c}</p>
              <p className="text-xs text-slate-500 mt-0.5">{approvedChwsIn(c)} approved CHWs · tiers with CHW visits need coverage</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3">Assisted Monitoring and Premium Family Care include CHW support — keep them off in cities without approved CHW coverage.</p>
      </Card>
    </div>
  );
}
