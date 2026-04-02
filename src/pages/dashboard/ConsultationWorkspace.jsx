import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAppContext } from '../../context/AppContext'
import { Loader2, ArrowLeft, CheckCircle, BadgeEuro } from 'lucide-react'
import { AppButton, ContentCard } from '../../components/dashboard/DashboardPrimitives'
import Modal from '../../components/common/Modal'
import { isValidTransition, RDV_STATUSES } from '../../lib/workflow'
import PinLock from '../../components/common/PinLock'

export default function ConsultationWorkspace() {
  const { rdv_id } = useParams()
  const navigate = useNavigate()
  const { profile, notify } = useAppContext()
  
  const [rdv, setRdv] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPaymentPopup, setShowPaymentPopup] = useState(false)
  const [currentConsultationId, setCurrentConsultationId] = useState(null)
  
  const [notes, setNotes] = useState('')
  const [montant, setMontant] = useState(300)

  useEffect(() => {
    async function loadRdv() {
      try {
        const { data, error } = await supabase
          .from('rdv')
          .select('*, patients(*)')
          .eq('id', rdv_id)
          .single()
          
        if (error) throw error
        if (!data) throw new Error('RDV introuvable')
        
        setRdv(data)
      } catch (err) {
        notify({ title: 'Erreur', description: 'Impossible de charger ce dossier.', variant: 'error' })
        navigate('/salle-attente')
      } finally {
        setLoading(false)
      }
    }
    loadRdv()
  }, [rdv_id, navigate, notify])

  const handleTerminer = async () => {
    if (!rdv) return
    if (!isValidTransition(rdv.status, RDV_STATUSES.COMPLETED)) {
      notify({ title: 'Erreur', description: 'Action invalide. La consultation n\'est pas active.', variant: 'error'})
      return
    }

    setSaving(true)
    try {
      // 1. Create the consultation record as 'credit' (unpaid) to pass off to System 4 (Billing)
      let consultId = null
      const { data: newConsult, error: consultError } = await supabase
        .from('consultations')
        .insert([{
          cabinet_id: profile.cabinet_id,
          patient_id: rdv.patient_id,
          rdv_id: rdv.id, // Soft dependency on SQL migration being run
          montant: Number(montant),
          statut: 'credit', 
          notes: notes
        }])
        .select()
        .maybeSingle()
        
      if (consultError) {
         console.warn("Could not insert rdv_id. Attempting fallback.", consultError)
         const { data: fallbackConsult, error: fallbackError } = await supabase
            .from('consultations')
            .insert([{ cabinet_id: profile.cabinet_id, patient_id: rdv.patient_id, montant: Number(montant), statut: 'credit', notes}])
            .select()
            .maybeSingle()
         if (fallbackError) throw fallbackError
         if (fallbackConsult) consultId = fallbackConsult.id
      } else if (newConsult) {
         consultId = newConsult.id
      }

      // 2. Complete the RDV flow securely
      const { error: rdvError } = await supabase.from('rdv').update({ status: RDV_STATUSES.COMPLETED }).eq('id', rdv.id)
      if (rdvError) throw rdvError

      if (consultId) {
        setCurrentConsultationId(consultId)
        setShowPaymentPopup(true)
      } else {
        notify({ title: 'Terminé', description: 'Consultation clôturée et transférée au secrétariat.', variant: 'success' })
        navigate('/salle-attente')
      }

    } catch (e) {
      console.error(e)
      notify({ title: 'Erreur', description: 'Échec de la clôture système.', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handlePayNow = async () => {
    if (!currentConsultationId) return
    setSaving(true)
    try {
      const { error } = await supabase.from('consultations').update({ statut: 'paye' }).eq('id', currentConsultationId)
      if (error) throw error
      notify({ title: 'Paiement Valide', description: 'La consultation a été encaissée avec succès.', variant: 'success'})
      if (rdv.id) {
        await supabase.from('rdv').update({ status: RDV_STATUSES.PAID }).eq('id', rdv.id)
      }
      setShowPaymentPopup(false)
      navigate('/salle-attente')
    } catch (e) {
      notify({ title: 'Erreur', description: 'Échec de l\'encaissement.', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handlePayLater = () => {
    setShowPaymentPopup(false)
    notify({ title: 'Transféré', description: 'Le dossier a été transféré à la facturation.', variant: 'warning' })
    navigate('/salle-attente')
  }

  if (loading) return <div className="p-20 flex justify-center w-full"><Loader2 className="animate-spin w-10 h-10 text-teal-600" /></div>
  if (!rdv) return null

  return (
    <PinLock>
      <div className="space-y-6 max-w-5xl mx-auto pb-20">
        <button onClick={() => navigate('/salle-attente')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium">
        <ArrowLeft size={18} /> Retour à la file d'attente
      </button>

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            Consultation 
            <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full uppercase tracking-wider">Workspace</span>
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Patient: <span className="font-bold text-slate-900">{rdv.patients?.prenom} {rdv.patients?.nom}</span>
          </p>
        </div>
        
        {rdv.status === RDV_STATUSES.IN_CONSULTATION ? (
          <button 
            onClick={handleTerminer} 
            disabled={saving}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg shadow-slate-900/20 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            Clôturer le Dossier
          </button>
        ) : (
          <div className="bg-slate-100 text-slate-500 px-5 py-2.5 rounded-xl font-bold uppercase text-sm border border-slate-200">
            Dossier {rdv.status}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        <div className="lg:col-span-2 space-y-6">
          <ContentCard title="Synthèse Clinique" subtitle="Renseignez vos observations et prescriptions">
             <div className="space-y-5">
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Observations</label>
                  <textarea 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    placeholder="Motif de consultation, examen physique, diagnostic..." 
                    className="w-full h-[320px] p-5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 bg-slate-50 text-slate-900 resize-none"
                  />
               </div>
             </div>
          </ContentCard>
        </div>

        <div className="space-y-6">
          <ContentCard title="Facturation">
             <div className="space-y-4">
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Montant de l'acte (MAD)</label>
                  <input 
                    type="number" 
                    value={montant}
                    onChange={e => setMontant(e.target.value)}
                    className="w-full font-bold text-3xl text-slate-900 p-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 bg-slate-50 text-right"
                  />
               </div>
               <div className="bg-blue-50 text-blue-700 p-3 rounded-xl text-xs font-semibold leading-relaxed border border-blue-100">
                 Ce montant sera instantanément transféré à l'accueil pour le règlement par la secrétaire (Statut de facturation: En attente).
               </div>
             </div>
          </ContentCard>
          
          <ContentCard title="Dossier Patient">
            <div className="text-sm space-y-3">
              <div className="flex justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500 font-medium">Téléphone</span>
                <span className="font-bold text-slate-900">{rdv.patients?.telephone || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500 font-medium">Allergies</span>
                <span className="font-bold text-rose-600">{rdv.patients?.allergies || 'Aucune connue'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500 font-medium">Mutuelle</span>
                <span className="font-bold text-slate-900">{rdv.patients?.mutuelle || '-'}</span>
              </div>
            </div>
          </ContentCard>
        </div>
        </div>
      </div>
      
      <Modal open={showPaymentPopup} onClose={() => {}} title="✅ Consultation terminée">
          <div className="space-y-6 text-center py-4">
              <div className="mx-auto w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Encaisser maintenant ?</h3>
              <p className="text-slate-500 mb-6 font-medium">Vous pouvez encaisser le montant de <span className="font-bold text-slate-900">{montant} MAD</span> ou le transférer à la facturation pour plus tard.</p>
              
              <div className="flex gap-4">
                 <AppButton onClick={handlePayNow} disabled={saving} className="flex-1 justify-center py-3">
                   {saving ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <BadgeEuro className="w-5 h-5 mr-2" />} Encaisser
                 </AppButton>
                 <AppButton variant="secondary" onClick={handlePayLater} disabled={saving} className="flex-1 justify-center py-3">
                    Plus tard
                 </AppButton>
              </div>
          </div>
      </Modal>
    </PinLock>
  )
}
