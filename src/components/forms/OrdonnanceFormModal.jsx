import { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import Modal from '../common/Modal'
import { useAppContext } from '../../context/AppContext'
import { useCabinetId } from '../../hooks/useCabinetId'
import { getPatients, createConsultation, createDocument } from '../../lib/api'
import { supabase } from '../../lib/supabase'

function OrdonnanceFormModal({ open, onClose, onSuccess }) {
  const { notify, profile, cabinet } = useAppContext()
  const { cabinetId } = useCabinetId()

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: getPatients,
    enabled: open,
  })

  const [form, setForm] = useState({
    patient_id: '',
    date: new Date().toISOString().split('T')[0],
    ville: '',
    medicaments: [{ id: Date.now().toString(), nom: '', posologie: '', duree: '' }],
    instructions: '',
    signe: true,
    nomMedecin: '',
    specialite: '',
    adresse: '',
    telephone: '',
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm({
        patient_id: '',
        date: new Date().toISOString().split('T')[0],
        ville: cabinet?.adresse?.split(',')[0] || cabinet?.ville || '',
        medicaments: [{ id: Date.now().toString(), nom: '', posologie: '', duree: '' }],
        instructions: '',
        signe: true,
        nomMedecin: profile?.nom_complet || '',
        specialite: profile?.specialite || 'Médecin généraliste',
        adresse: cabinet?.adresse || '',
        telephone: cabinet?.telephone || '',
      })
      setError(null)
    }
  }, [open, profile, cabinet])

  const handleMedsChange = (id, key, value) => {
    setForm(c => ({
      ...c,
      medicaments: c.medicaments.map(m => m.id === id ? { ...m, [key]: value } : m)
    }))
  }

  const addMed = () => {
    setForm(c => ({
      ...c,
      medicaments: [...c.medicaments, { id: Date.now().toString(), nom: '', posologie: '', duree: '' }]
    }))
  }

  const removeMed = (id) => {
    setForm(c => ({
      ...c,
      medicaments: c.medicaments.length > 1 ? c.medicaments.filter(m => m.id !== id) : c.medicaments
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    if (!form.patient_id) { setError('Sélectionnez un patient.'); return }
    if (!form.medicaments[0].nom.trim()) { setError('Au moins un médicament est requis.'); return }

    if (!cabinetId) {
      setError('Session expirée — reconnectez-vous.')
      return
    }

    setLoading(true)
    try {
      const selectedPatient = patients.find(p => p.id === form.patient_id)
      
      const newConsultation = await createConsultation({
        cabinet_id: cabinetId,
        patient_id: form.patient_id,
        montant: 0,
        statut: 'paye',
        date_consult: form.date,
        notes: JSON.stringify({
          type: 'ordonnance',
          medicaments: form.medicaments.filter(m => m.nom.trim()),
          instructions: form.instructions,
          ville: form.ville,
          signe: form.signe,
          medecin: form.nomMedecin,
          specialite: form.specialite,
          adresse: form.adresse,
          telephone: form.telephone
        })
      })

      await createDocument({
        cabinet_id: cabinetId,
        patient_id: form.patient_id,
        consultation_id: newConsultation.id,
        type_document: 'ordonnance',
        nom_fichier: `ordonnance_${selectedPatient.nom}_${selectedPatient.prenom}_${form.date}.pdf`.replace(/\s+/g, '_'),
        storage_path: 'pending' // Usually updated when PDF is actually generated in storage
      })

      // Generate PDF in background (optional, depends on if Edge function is deployed)
      try {
        supabase.functions.invoke('generate-pdf', {
          body: {
            type_document: 'ordonnance',
            patient_id: form.patient_id,
            cabinet_id: cabinetId,
            consultation_id: newConsultation.id
          }
        }).catch(console.warn) // Fire and forget
      } catch (e) {
        console.warn('PDF gen function failed', e)
      }

      notify({ title: 'Succès', description: 'Ordonnance créée avec succès.' })
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Ordonnance submit error:', err)
      setError(err.message || "Erreur lors de l'enregistrement de l'ordonnance")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle ordonnance" description="Saisissez les médicaments et personnalisez l'en-tête." width="max-w-4xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: En-tête */}
        <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-100">
          <p className="mb-4 text-base font-semibold text-slate-800">En-tête de l'ordonnance</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">Nom du médecin</span>
              <input value={form.nomMedecin} onChange={(e) => setForm(c => ({...c, nomMedecin: e.target.value}))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">Spécialité</span>
              <input value={form.specialite} onChange={(e) => setForm(c => ({...c, specialite: e.target.value}))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">Adresse du cabinet</span>
              <input value={form.adresse} onChange={(e) => setForm(c => ({...c, adresse: e.target.value}))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">Téléphone</span>
              <input value={form.telephone} onChange={(e) => setForm(c => ({...c, telephone: e.target.value}))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
            </label>
          </div>
        </div>

        {/* Section 2: Patient & Info */}
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block md:col-span-2">
            <span className="mb-2 block text-base font-medium text-slate-700">Patient *</span>
            <select value={form.patient_id} onChange={(e) => setForm(c => ({...c, patient_id: e.target.value}))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-300">
              <option value="">— Rechercher un patient —</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.prenom} {p.nom} {p.telephone ? `(${p.telephone})` : ''}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
               <span className="mb-2 block text-base font-medium text-slate-700">Date</span>
               <input type="date" value={form.date} onChange={(e) => setForm(c => ({...c, date: e.target.value}))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-300" />
            </label>
            <label className="block">
               <span className="mb-2 block text-base font-medium text-slate-700">Ville</span>
               <input type="text" value={form.ville} onChange={(e) => setForm(c => ({...c, ville: e.target.value}))} placeholder="Ville" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-300" />
            </label>
          </div>
        </div>

        {/* Section 3: Médicaments */}
        <div className="space-y-3">
          <span className="block text-base font-medium text-slate-700">Médicaments (Rx)</span>
          {form.medicaments.map((med, index) => (
            <div key={med.id} className="flex gap-2 items-start">
              <div className="pt-3 font-semibold text-slate-400 w-6 text-center">{index + 1}.</div>
              <input value={med.nom} onChange={e => handleMedsChange(med.id, 'nom', e.target.value)} placeholder="Nom du médicament (ex: Paracétamol 1g)" className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-300" />
              <input value={med.posologie} onChange={e => handleMedsChange(med.id, 'posologie', e.target.value)} placeholder="Posologie (ex: 1 cp 3x/j)" className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-300" />
              <input value={med.duree} onChange={e => handleMedsChange(med.id, 'duree', e.target.value)} placeholder="Durée (ex: 7 jours)" className="w-32 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-300" />
              <button type="button" onClick={() => removeMed(med.id)} className="shrink-0 rounded-2xl border border-slate-200 bg-white p-3 text-slate-400 hover:text-red-500 hover:border-red-200 transition">
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addMed} className="interactive ml-8 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
            <Plus className="h-4 w-4" /> Ajouter un médicament
          </button>
        </div>

        <label className="block">
          <span className="mb-2 block text-base font-medium text-slate-700">Notes / Instructions supplémentaires (optionnel)</span>
          <textarea value={form.instructions} onChange={(e) => setForm(c => ({...c, instructions: e.target.value}))} rows={2} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-300" placeholder="A prendre au milieu du repas, etc." />
        </label>

        {/* Section 4: Signature */}
        <div className="flex items-center gap-3 rounded-[24px] bg-slate-50 p-4 ring-1 ring-slate-100">
           <input type="checkbox" id="signe" checked={form.signe} onChange={(e) => setForm(c => ({...c, signe: e.target.checked}))} className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
           <label htmlFor="signe" className="text-base font-medium text-slate-700 cursor-pointer select-none">
             Apposer ma signature sur le document
           </label>
           {form.signe && (
             <blockquote className="ml-auto font-[cursive] text-lg text-slate-800 italic pr-4">
               Dr. {form.nomMedecin.split(' ').pop()}
             </blockquote>
           )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            ⚠️ {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="interactive rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base font-medium text-slate-700">Annuler</button>
          <button type="submit" disabled={loading} className="interactive inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-base font-medium text-white disabled:opacity-70">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...</> : 'Générer l\'ordonnance'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default OrdonnanceFormModal
