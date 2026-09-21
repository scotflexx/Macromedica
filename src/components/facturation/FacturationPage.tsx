import React from 'react';
import { useFacturationStore } from './store';
import { useFacturesQuery, useFacturationSync, useFilterOptions } from './queries';
import { filterFactures } from './selectors';
import { FilterBar } from './FilterBar';
import { Overview } from './Overview';
import { FacturesView } from './FacturesView';
import { PaiementsView } from './PaiementsView';
import { DebiteursView } from './DebiteursView';
import { DetailAvance } from './DetailAvance';
import { FactureDrawer } from './FactureDrawer';
import { RecuPaiement } from './RecuPaiement';
import { Download } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { factureNet, facturePaye, factureReste } from './data';

export default function FacturationPage() {
  const { filters, ui, setTab, showToast } = useFacturationStore();
  const { data: factures = [] } = useFacturesQuery();
  const { praticiens } = useFilterOptions();
  useFacturationSync();
  const reduceMotion = useReducedMotion();
  const filteredFactures = filterFactures(factures, filters);

  const handleExportCSV = () => {
    const headers = ['Numéro', 'Date', 'Échéance', 'Patient', 'Praticien', 'Mutuelle', 'Facturé', 'Payé', 'Reste', 'Statut'];
    const money = (n: number) => n.toFixed(2).replace('.', ',');

    const rows = filteredFactures.map(f => [
      f.numero,
      f.dateEmission.split('T')[0],
      f.dateEcheance.split('T')[0],
      `"${f.patientNom.replace(/"/g, '""')}"`,
      praticiens.find(p => p.id === f.praticienId)?.nom || '',
      f.assureurId,
      money(factureNet(f)),
      money(facturePaye(f)),
      money(factureReste(f)),
      f.statut
    ].join(';'));

    const csvContent = '﻿' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `facturation_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Export de ${filteredFactures.length} factures réussi.`);
  };

  const renderView = () => {
    switch (ui.tab) {
      case 'apercu': return <Overview />;
      case 'factures': return <FacturesView />;
      case 'paiements': return <PaiementsView />;
      case 'debiteurs': return <DebiteursView />;
      case 'avance': return <DetailAvance />;
      default: return <Overview />;
    }
  };

  const tabs = [
    { id: 'apercu', label: 'Aperçu' },
    { id: 'factures', label: 'Factures' },
    { id: 'paiements', label: 'Paiements' },
    { id: 'debiteurs', label: 'Débiteurs' },
    { id: 'avance', label: 'Détail avancé' }
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-[1800px] mx-auto space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-black text-slate-900 leading-tight">Facturation & Encaissements</h1>
            <p className="mt-0.5 text-[15px] font-medium text-slate-500">
              Suivi complet des recettes du cabinet • {filteredFactures.length} factures affichées
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 rounded-[10px] bg-white border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:bg-slate-50 hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
            >
              <Download className="w-4 h-4" strokeWidth={2.5} />
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 border-b border-slate-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={cn(
                "pb-3 text-sm font-medium transition-colors relative",
                ui.tab === tab.id ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {tab.label}
              {ui.tab === tab.id && (
                // One shared underline that glides between tabs
                <motion.span
                  layoutId="facturation-tab-underline"
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }}
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"
                />
              )}
            </button>
          ))}
        </div>

        <FilterBar />

        {/* Tab content fades and lifts in (the outgoing tab fades out first). Off with reduced motion. */}
        <div className="mt-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={ui.tab}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>

      <FactureDrawer />
      <RecuPaiement />

      {ui.toast && (
        <div className={cn(
          "fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-bottom-5 z-50 transition-all",
          ui.toast.type === 'error' ? "bg-red-600 text-white" : "bg-slate-800 text-white"
        )}>
          {ui.toast.message}
        </div>
      )}
    </div>
  );
}
