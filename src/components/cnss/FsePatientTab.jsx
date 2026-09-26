import React, { useState, useEffect } from 'react'
import { FileText, Download, RefreshCw, AlertCircle, Info, CheckCircle2, MessageCircle, Share2, Layers } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { generateFSE, sanitizeCIN, isValidCIN, sanitizeNumericOnly, validateFseData } from './generateFSE'
import { sendFseViaWhatsApp } from '../../lib/whatsappService'
import { supabase } from '../../lib/supabase'

/**
 * FsePatientTab — FSE CNSS generator wired to live Supabase DB & patient state.
 *
 * Props:
 *   patient  — patient object from getPatientById (fields: id, nom, prenom, cin,
 *              numero_cnss, date_naissance, sexe, adresse, ville, mutuelle, telephone)
 *   profile  — doctor profile from AppContext (fields: nom_complet, cabinet_id,
 *              cabinets?.nom, etc.)
 */
export default function FsePatientTab({ patient, profile }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState(null)
  const [isDebugMode, setIsDebugMode] = useState(false)
  const [includeAnnex, setIncludeAnnex] = useState(false)
  const [consultPrice, setConsultPrice] = useState('150')
  const [piecesJointes, setPiecesJointes] = useState('1')
  
  // Live Supabase database binding state
  const [dbConsultations, setDbConsultations] = useState([])
  const [selectedConsultId, setSelectedConsultId] = useState('')
  const [isDbLoading, setIsDbLoading] = useState(false)

  const cleanCin = sanitizeCIN(patient?.cin)
  const cinValid = isValidCIN(cleanCin)
  const cleanCnss = sanitizeNumericOnly(patient?.numero_cnss || patient?.immatriculation)
  const patientPhone = patient?.telephone || patient?.phone || ''

  // --- Live Supabase DB Query for Patient Consultations & Billing ---
  useEffect(() => {
    if (!patient?.id) return

    const loadLiveConsultations = async () => {
      setIsDbLoading(true)
      try {
        const { data, error } = await supabase
          .from('consultations')
          .select('*')
          .eq('patient_id', patient.id)
          .order('date_consult', { ascending: false })

        if (!error && data && data.length > 0) {
          setDbConsultations(data)
          setSelectedConsultId(data[0].id)
          if (data[0].montant) setConsultPrice(String(data[0].montant))
        }
      } catch (err) {
        console.warn('[FsePatientTab] Erreur chargement consultations Supabase :', err)
      } finally {
        setIsDbLoading(false)
      }
    }

    loadLiveConsultations()
  }, [patient?.id])

  // --- Handle consultation change ---
  const handleSelectConsultation = (e) => {
    const cId = e.target.value
    setSelectedConsultId(cId)
    const consult = dbConsultations.find((c) => c.id === cId)
    if (consult) {
      if (consult.montant) setConsultPrice(String(consult.montant))
    }
  }

  // --- Missing or invalid field detection ---
  const missingFields = []
  if (!cleanCin) missingFields.push('CIN')
  if (!cleanCnss) missingFields.push('N° CNSS')
  if (!patient?.date_naissance) missingFields.push('Date de naissance')
  if (!patient?.sexe) missingFields.push('Sexe')
  if (!patient?.adresse) missingFields.push('Adresse')

  // --- Map DB patient → generateFSE format ---
  const buildPatientObj = () => ({
    id: patient?.id,
    first_name: patient?.prenom || '',
    last_name: patient?.nom || '',
    nomComplet: `${patient?.prenom || ''} ${patient?.nom || ''}`.trim(),
    cin: cleanCin,
    cnss_number: cleanCnss,
    immatriculation: cleanCnss,
    date_of_birth: patient?.date_naissance || '',
    dateNaissance: formatDateForFSE(patient?.date_naissance),
    gender: patient?.sexe || 'M',
    sexe: patient?.sexe || 'M',
    address: patient?.adresse || patient?.ville || '',
    adresse: patient?.adresse || patient?.ville || '',
    telephone: patientPhone,
    montant: Number(consultPrice) || 150,
    piecesJointes: Number(piecesJointes) || 1,
  })

  // --- Map doctor profile → generateFSE format ---
  const buildDoctorObj = () => ({
    name: profile?.nom_complet || 'Dr. Médecin Traitant',
    specialty: profile?.specialty || profile?.specialite || 'Médecine Générale',
    inpe_code: sanitizeNumericOnly(profile?.inpe_code || profile?.inpe),
    city: profile?.cabinets?.ville || profile?.ville || 'Casablanca',
    etablissement: profile?.cabinets?.nom || profile?.cabinet_nom || 'Cabinet Médical',
  })

  const handleGenerate = async () => {
    if (isGenerating) return
    setIsGenerating(true)
    try {
      const patientObj = buildPatientObj()
      const doctorObj = buildDoctorObj()
      const selectedConsult = dbConsultations.find((c) => c.id === selectedConsultId)

      const consultObj = {
        price: consultPrice,
        pieces_jointes: piecesJointes,
        date: selectedConsult?.date_consult
          ? new Date(selectedConsult.date_consult).toLocaleDateString('fr-FR')
          : new Date().toLocaleDateString('fr-FR'),
        dossier_numero: selectedConsult?.id ? `DOS-${String(selectedConsult.id).substring(0, 6).toUpperCase()}` : '',
        acts: selectedConsult?.actes || [
          { date: new Date().toLocaleDateString('fr-FR'), code: 'C', label: 'Consultation de médecine générale', qte: 1, montant: consultPrice }
        ],
      }

      const url = await generateFSE(patientObj, doctorObj, consultObj, {
        debug: isDebugMode,
        includeAnnex: includeAnnex || Number(piecesJointes) > 1,
      })

      if (url) {
        setGeneratedPdfUrl(url)
        toast.success('FSE générée avec succès !')
      }
    } catch (err) {
      console.error('Erreur génération FSE :', err)
      const message = err?.message || 'Erreur lors de la génération de la Feuille de Soins.'
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }

  // --- Direct 1-Click WhatsApp Delivery ---
  const handleShareWhatsApp = async () => {
    if (!patientPhone) {
      toast.error('Aucun numéro de téléphone valide enregistré pour ce patient.')
      return
    }

    const patientName = `${patient?.prenom || ''} ${patient?.nom || ''}`.trim()
    toast.loading('Préparation de l\'envoi WhatsApp...', { id: 'wa-fse' })

    try {
      const res = await sendFseViaWhatsApp({
        patientPhone,
        patientName,
        documentUrl: generatedPdfUrl,
        montantTotal: consultPrice,
      })

      if (res?.success) {
        toast.success('Partage WhatsApp prêt !', { id: 'wa-fse' })
      } else {
        toast.error('Erreur lors du partage WhatsApp.', { id: 'wa-fse' })
      }
    } catch (err) {
      console.error('Erreur WhatsApp :', err)
      toast.error('Échec de l\'envoi WhatsApp.', { id: 'wa-fse' })
    }
  }

  return (
    <div className="space-y-5">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Feuille de Soins CNSS (FSE)
          </h2>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Génération automatique sur modèle officiel CNSS & binding direct avec la base de données
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer select-none bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
            <input
              type="checkbox"
              checked={includeAnnex}
              disabled={isGenerating}
              onChange={(e) => setIncludeAnnex(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <Layers size={13} className="text-slate-500" />
              Feuille d'Annexe
            </span>
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer select-none bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
            <input
              type="checkbox"
              checked={isDebugMode}
              disabled={isGenerating}
              onChange={(e) => {
                setIsDebugMode(e.target.checked)
                if (generatedPdfUrl) handleGenerate()
              }}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
            />
            <span>Mode Repères</span>
          </label>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isGenerating ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Download size={15} />
            )}
            <span>{isGenerating ? 'Génération...' : 'Générer PDF FSE'}</span>
          </button>

          {/* 1-Click WhatsApp Share Button */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            title="Envoyer ou partager la Feuille de Soins sur WhatsApp"
          >
            <MessageCircle size={15} />
            <span>Envoyer WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Missing fields warning */}
      {missingFields.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-[13px] text-amber-800">
            <span className="font-bold">Informations manquantes :</span>{' '}
            {missingFields.join(', ')}. Le PDF sera généré mais certains champs seront vides.
            Complétez le dossier patient dans la base de données.
          </div>
        </div>
      )}

      {/* Invalid CIN format warning */}
      {cleanCin && !cinValid && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <div className="text-[13px] text-rose-800">
            <span className="font-bold">Format CIN non conforme :</span>{' '}
            "{cleanCin}" ne respecte pas le format marocain officiel (1 à 2 lettres suivies de 4 à 6 chiffres, ex: AB123456).
          </div>
        </div>
      )}

      {/* Patient Data Preview */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Info size={15} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Données patient en direct (Supabase)
            </span>
          </div>
          {patientPhone && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-md flex items-center gap-1">
              <MessageCircle size={12} /> {patientPhone}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 text-xs">
          <DataCell label="Nom & Prénom" value={`${patient?.prenom || '—'} ${patient?.nom || '—'}`} />
          <DataCell
            label="N° CIN"
            value={cleanCin ? `${cleanCin}${cinValid ? ' (conforme)' : ' (invalide)'}` : '—'}
            mono
            highlight={cinValid ? 'blue' : 'rose'}
          />
          <DataCell label="Immatriculation CNSS" value={cleanCnss || '—'} mono highlight="emerald" />
          <DataCell label="Date de Naissance" value={patient?.date_naissance ? new Date(patient.date_naissance).toLocaleDateString('fr-FR') : '—'} />
          <DataCell label="Sexe" value={patient?.sexe === 'F' ? 'Femme (F)' : patient?.sexe === 'M' ? 'Homme (M)' : '—'} />
          <DataCell label="Mutuelle" value={patient?.mutuelle || 'CNSS'} />
          <DataCell label="Ville" value={patient?.ville || '—'} />
          <div className="col-span-2 sm:col-span-3 md:col-span-4 bg-white p-2 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Adresse</span>
            <span className="text-slate-700 text-xs block truncate">{patient?.adresse || '—'}</span>
          </div>
        </div>
      </div>

      {/* Consultation Selector & Params */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
          Paramètres de consultation & Facturation
        </span>

        {/* Live Consultation Selector */}
        {dbConsultations.length > 0 && (
          <div className="mb-3">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
              Sélectionner la consultation (Supabase)
            </label>
            <select
              value={selectedConsultId}
              onChange={handleSelectConsultation}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
            >
              {dbConsultations.map((c) => (
                <option key={c.id} value={c.id}>
                  Consultation du {new Date(c.date_consult || c.created_at).toLocaleDateString('fr-FR')} — Montant: {c.montant || 150} MAD ({c.statut || 'Terminée'})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
              Montant des soins (MAD)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={consultPrice}
              onChange={(e) => setConsultPrice(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Ex: 150"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
              Pièces Jointes
            </label>
            <input
              type="number"
              min="0"
              max="99"
              value={piecesJointes}
              onChange={(e) => setPiecesJointes(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Ex: 1"
            />
          </div>
        </div>
      </div>

      {/* PDF Preview */}
      {generatedPdfUrl && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Aperçu de la Feuille de Soins générée :
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1"
              >
                <MessageCircle size={13} /> Partager via WhatsApp
              </button>
              <a
                href={generatedPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 underline font-semibold"
              >
                Ouvrir en plein écran
              </a>
            </div>
          </div>
          <iframe
            src={generatedPdfUrl}
            title="CNSS FSE Aperçu"
            className="w-full h-[540px] rounded-xl border border-gray-300 shadow-inner"
          />
        </div>
      )}
    </div>
  )
}

// --- Small helper sub-components ---

function DataCell({ label, value, mono = false, highlight }) {
  const valueClass = [
    mono ? 'font-mono font-bold' : 'font-medium',
    highlight === 'blue' ? 'text-blue-700' : highlight === 'emerald' ? 'text-emerald-700' : highlight === 'rose' ? 'text-rose-700' : 'text-slate-700',
    'block text-xs',
  ].join(' ')

  return (
    <div className="bg-white p-2 rounded-lg border border-slate-200">
      <span className="text-[10px] uppercase font-bold text-slate-400 block">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  )
}

/**
 * Convert ISO date (YYYY-MM-DD) or already-formatted (DD/MM/YYYY) to DDMMYYYY
 * which is what generateFSE expects for the individual character boxes.
 */
function formatDateForFSE(dateStr) {
  if (!dateStr) return ''
  if (/^\d{8}$/.test(dateStr)) return dateStr
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [y, m, d] = dateStr.split('T')[0].split('-')
    return `${d}${m}${y}`
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr.replace(/\//g, '')
  }
  return dateStr
}
