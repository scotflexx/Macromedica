import { supabase } from '@/lib/supabase';
import { processVisitPayment } from '@/lib/visitService';
import { DELAI_PAIEMENT_JOURS, Facture, Mode, Paiement, Statut } from './data';

const PAGE_SIZE = 1000;
const MS_DAY = 86400000;

const modeFromDB = (method: string | null): Mode => {
  switch (method) {
    case 'cash': return 'Especes';
    case 'card': return 'Carte';
    case 'transfer': return 'Virement';
    case 'insurance': return 'Tiers payant';
    default: return 'Autre';
  }
};

const computeStatut = (status: string, amount: number, paid: number, createdAt: string): Statut => {
  if (status === 'paid') return 'payee';
  const age = (Date.now() - new Date(createdAt).getTime()) / MS_DAY;
  if (age > DELAI_PAIEMENT_JOURS) return 'en_retard';
  return paid > 0 ? 'partielle' : 'en_attente';
};

// Every billed visit of the clinic (paid or still owing). Waived / cancelled / refunded rows
// carry no revenue and are left out. Tenant scope: explicit clinic_id filter, and RLS on top.
// With `patientId`, only that patient's factures (still scoped to the clinic).
export const fetchFactures = async (clinicId: string, patientId?: string): Promise<Facture[]> => {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from('payments')
      .select('id, visit_id, patient_id, amount, amount_paid, status, method, paid_at, created_at, visits:visit_id(doctor_id), patients:patient_id(nom, prenom, mutuelle)')
      .eq('clinic_id', clinicId)
      .in('status', ['pending', 'paid']);
    if (patientId) query = query.eq('patient_id', patientId);
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  return rows.map((p): Facture => {
    const montant = Number(p.amount) || 0;
    const paye = Number(p.amount_paid) || 0;
    const patient = p.patients;
    const paiements: Paiement[] = paye > 0
      ? [{ id: p.id, date: p.paid_at || p.created_at, montant: paye, mode: modeFromDB(p.method) }]
      : [];
    return {
      id: p.id,
      numero: `FAC-${String(p.id).slice(0, 6).toUpperCase()}`,
      dateEmission: p.created_at,
      dateEcheance: new Date(new Date(p.created_at).getTime() + DELAI_PAIEMENT_JOURS * MS_DAY).toISOString(),
      visitId: p.visit_id || null,
      praticienId: p.visits?.doctor_id || '',
      patientId: p.patient_id,
      patientNom: patient ? `${patient.prenom || ''} ${patient.nom || ''}`.trim() || 'Patient inconnu' : 'Patient inconnu',
      assureurId: patient?.mutuelle ? String(patient.mutuelle) : '',
      montant,
      paye,
      statut: computeStatut(p.status, montant, paye, p.created_at),
      paiements,
    };
  });
};

// Collect through the same RPC the cashier queue uses. A collection below the remaining balance
// is sent as an explicit partial payment; the RPC rejects any other short payment.
// method is the database value accepted by process_visit_payment: cash | card | transfer | insurance.
export const encaisserFacture = async (facture: Facture, montant: number, method: string) => {
  if (!facture.visitId) throw new Error('Cette facture n\'est liée à aucune visite : encaissement impossible.');
  const reste = Math.max(0, facture.montant - facture.paye);
  return processVisitPayment(facture.visitId, method, montant, { partial: montant < reste });
};
