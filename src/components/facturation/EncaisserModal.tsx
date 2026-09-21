import { useCallback, useEffect, useState } from 'react';
import { useFacturationStore } from './store';
import { useEncaisser } from './queries';
import { useAppContext } from '../../context/AppContext';
import { Facture, facturePaye, factureReste } from './data';
import { dh } from './format';
import PaymentModal, { paymentAmountState } from '../common/PaymentModal';

// Payment collection for a facture, on top of the shared payment UI (common/PaymentModal).
// The hook owns the state and the call; hosts render it either as a modal (EncaisserModal, from
// the Débiteurs list) or embedded in the facture detail (FactureDrawer).
export function useFacturePayment(facture: Facture | null) {
  const { can } = useAppContext();
  const { showToast } = useFacturationStore();
  const encaisser = useEncaisser();

  const reste = facture ? factureReste(facture) : 0;
  const [amount, setAmount] = useState(String(reste));
  const [method, setMethod] = useState('cash');
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ paid: number; reste: number } | null>(null);

  // (Re)start a collection with the full remaining balance as the default amount.
  const start = useCallback(() => {
    setAmount(String(reste));
    setMethod('cash');
    setError('');
    setDone(null);
  }, [reste]);

  const blockedReason = !facture
    ? null
    : !can('billing.collect')
      ? "Vous n'avez pas l'autorisation d'encaisser."
      : !facture.visitId
        ? "Cette facture n'est liée à aucune visite : elle ne peut pas être encaissée ici."
        : null;

  const confirm = async () => {
    if (!facture) return;
    const { value, valid } = paymentAmountState(amount, reste);
    if (!valid) {
      setError(value > reste ? `Le montant dépasse le reste à payer (${dh(reste)}).` : 'Montant invalide.');
      return;
    }
    setError('');
    try {
      await encaisser.mutateAsync({ facture, montant: value, method });
      setDone({ paid: value, reste: reste - value });
      showToast(value < reste
        ? `Paiement partiel de ${dh(value)} enregistré. Reste à payer : ${dh(reste - value)}.`
        : `Paiement de ${dh(value)} enregistré.`);
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'enregistrement du paiement.");
    }
  };

  return {
    total: facture ? facture.montant : 0,
    alreadyPaid: facture ? facturePaye(facture) : 0,
    reste, amount, setAmount, method, setMethod,
    processing: encaisser.isPending, error, blockedReason, done, start, confirm,
  };
}

interface EncaisserModalProps {
  facture: Facture | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EncaisserModal({ facture, isOpen, onClose }: EncaisserModalProps) {
  const pay = useFacturePayment(facture);
  const { setRecuPaiementId } = useFacturationStore();

  useEffect(() => {
    if (isOpen) pay.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, facture?.id]);

  if (!facture) return null;

  return (
    <PaymentModal
      open={isOpen}
      patientName={facture.patientNom}
      total={pay.total}
      alreadyPaid={pay.alreadyPaid}
      reste={pay.reste}
      amount={pay.amount}
      onAmountChange={pay.setAmount}
      method={pay.method}
      onMethodChange={pay.setMethod}
      processing={pay.processing}
      error={pay.error}
      blockedReason={pay.blockedReason}
      onConfirm={pay.confirm}
      onCancel={onClose}
      done={pay.done}
      onReceiptYes={() => { setRecuPaiementId(facture.id); onClose(); }}
      onReceiptNo={onClose}
    />
  );
}
