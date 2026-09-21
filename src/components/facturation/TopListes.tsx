import React from 'react';
import { useFacturationStore } from './store';
import { useFacturesQuery } from './queries';
import { Skeleton, ErrorState } from './ui';
import { filterFactures } from './selectors';
import { Card, SectionTitle, StatutBadge } from './ui';
import { dh, fmtDate } from './format';
import { factureNet } from './data';

// Latest billed consultations. (A "top actes" ranking is not shown: the individual actes of a
// consultation are not stored, only the total billed.)
export function TopListes() {
  const { filters, setFactureOuverteId } = useFacturationStore();
  const { data: factures = [], isLoading, isError, error, refetch } = useFacturesQuery();
  const filteredFactures = filterFactures(factures, filters);

  if (isLoading) return <Skeleton className="h-64 w-full mt-6" />;
  if (isError) return <ErrorState error={error as Error} onRetry={refetch} />;

  const dernieres = [...filteredFactures]
    .sort((a, b) => new Date(b.dateEmission).getTime() - new Date(a.dateEmission).getTime())
    .slice(0, 8);

  return (
    <Card>
      <SectionTitle title="Dernières factures" subtitle="Consultations facturées récemment" />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="pb-2 font-medium">N° Facture</th>
              <th className="pb-2 font-medium">Patient</th>
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium text-right">Montant</th>
              <th className="pb-2 font-medium pl-4">Statut</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-100">
            {dernieres.map((f) => (
              <tr
                key={f.id}
                onClick={() => setFactureOuverteId(f.id)}
                className="hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                <td className="py-2.5 font-medium text-blue-600 group-hover:text-blue-700">{f.numero}</td>
                <td className="py-2.5 text-slate-900 truncate max-w-[160px]">{f.patientNom}</td>
                <td className="py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(f.dateEmission)}</td>
                <td className="py-2.5 font-bold text-slate-900 text-right whitespace-nowrap">{dh(factureNet(f))}</td>
                <td className="py-2.5 pl-4 whitespace-nowrap"><StatutBadge statut={f.statut} /></td>
              </tr>
            ))}
            {dernieres.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-500 text-sm">
                  Aucune facture sur cette période.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
