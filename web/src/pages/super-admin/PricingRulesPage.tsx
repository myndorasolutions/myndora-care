import { PageHeader } from '@/components/ui/PageHeader';

const rules = [
  { service: 'CHW home visit', commission: '15%', platform_fee: '₦500' },
  { service: 'Clinician teleconsult', commission: '20%', platform_fee: '₦1,000' },
  { service: 'Pharmacy refill', commission: '5%', platform_fee: '₦200' },
  { service: 'Lab panel', commission: '8%', platform_fee: '₦350' },
];

export function PricingRulesPage() {
  return (
    <>
      <PageHeader title="Pricing rules" subtitle="Commission and fee configuration" />
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[28rem] text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-left">Service</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Commission</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Platform fee</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.service} className="border-t border-slate-100">
                <td className="px-4 py-3">{r.service}</td>
                <td className="px-4 py-3">{r.commission}</td>
                <td className="px-4 py-3">{r.platform_fee}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="btn-outline text-xs">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
