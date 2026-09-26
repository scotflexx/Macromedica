import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFacturationStore } from './store';
import { useFacturesQuery, useFilterOptions } from './queries';
import { Facture, facturePaye, factureReste } from './data';
import { dh, fmtDateLong, joursRetard } from './format';
import { Card, StatutBadge } from './ui';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { X, Printer, CreditCard, AlertCircle, ArrowLeft, FileText, MessageCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFacturePayment } from './EncaisserModal';
import { PaymentBody, PaymentFooter, PaymentDone } from '../common/PaymentModal';
import { sendFseViaWhatsApp } from '../../lib/whatsappService';

const LABEL = 'text-xs font-semibold text-slate-400 uppercase tracking-wide';

interface FactureDetailProps {
  facture: Facture;
  praticienNom?: string;
  onClose: () => void;
  onPrint: () => void;
  onEncaisser: () => void;
}

// Presentational modal: Montants (reste à payer first), then the facture details, then the
// payments list. It only takes the height its content needs, so the footer sits right below.
export function FactureDetail({ facture, praticienNom, onClose, onPrint, onEncaisser }: FactureDetailProps) {
  const paye = facturePaye(facture);
  const reste = factureReste(facture);
  const retard = joursRetard(facture.dateEcheance);
  const isLate = facture.statut === 'en_retard';
  const paiements = [...facture.paiements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={(e) => e.stopPropagation()}
      className="flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl print:max-h-none print:max-w-none print:shadow-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 print:hidden">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900">{facture.numero}</h2>
          <StatutBadge statut={facture.statut} />
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content: as tall as it needs, scrolls only when it exceeds the viewport */}
      <div className="min-h-0 space-y-4 overflow-y-auto p-6">

        {/* Montants: supporting figures small, Reste à payer is the focal point */}
        <Card tone="muted">
          <p className={LABEL}>Montants</p>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex items-center justify-between text-slate-500">
              <dt>Facturé</dt>
              <dd className="font-semibold text-slate-700">{dh(facture.montant, true)}</dd>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <dt>Encaissé</dt>
              <dd className="font-semibold text-slate-700">{dh(paye, true)}</dd>
            </div>
          </dl>
          <div
            className={cn(
              'mt-4 flex items-end justify-between gap-4 rounded-xl border px-4 py-3.5',
              reste > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
            )}
          >
            <div>
              <p className={cn('text-xs font-bold uppercase tracking-wide', reste > 0 ? 'text-amber-700' : 'text-emerald-700')}>
                {reste > 0 ? 'Reste à payer' : 'Soldé'}
              </p>
              {isLate && reste > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-600">
                  <AlertCircle className="h-3 w-3" /> En retard de {retard} jours
                </p>
              )}
            </div>
            <p className={cn('text-3xl font-black leading-none tracking-tight', reste > 0 ? 'text-amber-700' : 'text-emerald-700')}>
              {dh(reste, true)}
            </p>
          </div>
        </Card>

        {/* Détails */}
        <Card tone="muted" className="grid grid-cols-2 gap-6">
          <div>
            <p className={LABEL}>Patient</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{facture.patientNom}</p>
          </div>
          <div>
            <p className={LABEL}>Date</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{fmtDateLong(facture.dateEmission)}</p>
            {reste > 0 && <p className="mt-0.5 text-xs text-slate-500">Échéance : {fmtDateLong(facture.dateEcheance)}</p>}
          </div>
          <div>
            <p className={LABEL}>Praticien</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{praticienNom || 'Non renseigné'}</p>
          </div>
          <div>
            <p className={LABEL}>Mutuelle</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{facture.assureurId || 'Sans assurance'}</p>
          </div>
        </Card>

        {/* Paiements: newest first, one row per collection */}
        <Card tone="muted">
          <div className="flex items-center justify-between">
            <p className={LABEL}>Paiements</p>
            {paiements.length > 0 && <Badge tone="neutral">{paiements.length}</Badge>}
          </div>
          {paiements.length === 0 ? (
            <p className="mt-3 text-sm italic text-slate-500">Aucun paiement enregistré.</p>
          ) : (
            <ol className="mt-3">
              {paiements.map((p, i) => (
                <li key={p.id} className="relative flex items-center justify-between gap-4 pb-3 pl-5 last:pb-0">
                  {/* timeline rail + dot */}
                  {i < paiements.length - 1 && <span className="absolute left-[3px] top-3 h-full w-px bg-slate-200" aria-hidden />}
                  <span className="absolute left-0 top-[9px] h-[7px] w-[7px] rounded-full bg-emerald-500" aria-hidden />
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{fmtDateLong(p.date)}</span>
                    <Badge tone="neutral">{p.mode === 'Especes' ? 'Espèces' : p.mode}</Badge>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-slate-900">{dh(p.montant)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* Footer sits right under the content */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4 print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onPrint}>
            <Printer className="h-4 w-4" /> Imprimer
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              sendFseViaWhatsApp({
                patientPhone: '',
                patientName: facture.patientNom,
                montantTotal: facture.montant,
              });
            }}
          >
            <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp
          </Button>
        </div>
        {reste > 0 && (
          <Button variant="success" onClick={onEncaisser}>
            <CreditCard className="h-4 w-4" /> Encaisser
          </Button>
        )}
      </div>
    </motion.div>
  );
}

type FacturePayment = ReturnType<typeof useFacturePayment>;

// The shared payment UI, shown in place of the detail (no second modal stacked on top).
export function FacturePaymentPanel({ facture, pay, onBack, onReceiptYes }: {
  facture: Facture; pay: FacturePayment; onBack: () => void; onReceiptYes: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      onClick={(e) => e.stopPropagation()}
      className="flex w-full max-w-lg max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
    >
      {pay.done ? (
        <div className="p-8">
          <PaymentDone patientName={facture.patientNom} done={pay.done} onReceiptYes={onReceiptYes} onReceiptNo={onBack} />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
            <button
              onClick={onBack}
              disabled={pay.processing}
              className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
              aria-label="Retour au détail de la facture"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Encaisser</h2>
              <p className="text-xs font-medium text-slate-500">{facture.numero} · {facture.patientNom}</p>
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto p-6">
            <PaymentBody
              total={pay.total} alreadyPaid={pay.alreadyPaid} reste={pay.reste}
              amount={pay.amount} onAmountChange={pay.setAmount}
              method={pay.method} onMethodChange={pay.setMethod}
              error={pay.error} blockedReason={pay.blockedReason}
            />
          </div>
          <div className="border-t border-slate-200 bg-white px-6 py-4">
            <PaymentFooter
              amount={pay.amount} reste={pay.reste} processing={pay.processing} blockedReason={pay.blockedReason}
              onCancel={onBack} onConfirm={pay.confirm} cancelLabel="Retour"
            />
          </div>
        </>
      )}
    </motion.div>
  );
}

export function FactureDrawer() {
  const { ui, setFactureOuverteId, setRecuPaiementId } = useFacturationStore();
  const { data: factures = [] } = useFacturesQuery();
  const { praticiens } = useFilterOptions();
  const [view, setView] = useState<'detail' | 'pay'>('detail');

  const facture = factures.find(f => f.id === ui.factureOuverteId);
  const pay = useFacturePayment(facture ?? null);

  // Always open on the detail.
  useEffect(() => { setView('detail'); }, [ui.factureOuverteId]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || pay.processing) return;
      if (view === 'pay') setView('detail');
      else setFactureOuverteId(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [view, pay.processing, setFactureOuverteId]);

  if (!facture) return null;

  const handleClose = () => { if (!pay.processing) setFactureOuverteId(null); };
  const startPay = () => { pay.start(); setView('pay'); };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm print:static print:block print:bg-transparent print:p-0"
      onClick={handleClose}
    >
      {view === 'pay' ? (
        <FacturePaymentPanel
          facture={facture}
          pay={pay}
          onBack={() => setView('detail')}
          onReceiptYes={() => { setRecuPaiementId(facture.id); setFactureOuverteId(null); }}
        />
      ) : (
        <FactureDetail
          facture={facture}
          praticienNom={praticiens.find(p => p.id === facture.praticienId)?.nom}
          onClose={handleClose}
          onPrint={() => window.print()}
          onEncaisser={startPay}
        />
      )}
    </div>
  );
}