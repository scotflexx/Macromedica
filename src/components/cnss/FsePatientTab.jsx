import React, { useState } from 'react'
import { FileText, Download, RefreshCw, AlertCircle, Info, CheckCircle2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { generateFSE, sanitizeCIN, isValidCIN, sanitizeNumericOnly, validateFseData } from './generateFSE'

/**
 * FsePatientTab — FSE CNSS generator wired to a real patient from the DB.
 *
 * Props:
 *   patient  — patient object from getPatientById (fields: nom, prenom, cin,
 *              numero_cnss, date_naissance, sexe, adresse, ville, mutuelle)
 *   profile  — doctor profile from AppContext (fields: nom_complet, cabinet_id,
 *              cabinets?.nom, etc.)
 */
export default function FsePatientTab({ patient, profile }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState(null)
  const [isDebugMode, setIsDebugMode] = useState(false)
  const [consultPrice, setConsultPrice] = useState('150')
  const [piecesJointes, setPiecesJointes] = useState('1')

  const cleanCin = sanitizeCIN(patient?.cin)
  const cinValid = isValidCIN(cleanCin)
  const cleanCnss = sanitizeNumericOnly(patient?.numero_cnss || patient?.immatriculation)

  // --- Missing or invalid field detection ---
  const missingFields = []
  if (!cleanCin) missingFields.push('CIN')
  if (!cleanCnss) missingFields.push('N° CNSS')
  if (!patient?.date_naissance) missingFields.push('Date de naissance')
  if (!patient?.sexe) missingFields.push('Sexe')
  if (!patient?.adresse) missingFields.push('Adresse')

  // --- Map DB patient → generateFSE format ---
  const buildPatientObj = () => ({
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
    montant: Number(consultPrice) || 150,
    piecesJointes: Number(piecesJointes) || 1,
  })

  // --- Map doctor profile → generateFSE format ---
  const buildDoctorObj = () => ({
    name: profile?.nom_complet || 'Dr. Médecin',
    specialty: profile?.specialty || profile?.specialite || 'Médecine Générale',
    inpe_code: sanitizeNumericOnly(profile?.inpe_code || profile?.inpe),
    city: profile?.cabinets?.ville || profile?.ville || '',
    etablissement: profile?.cabinets?.nom || profile?.cabinet_nom || '',
  })

  const handleGenerate = async () => {
    if (isGenerating) return
    setIsGenerating(true)
    try {
      const patientObj = buildPatientObj()
      const doctorObj = buildDoctorObj()
      const consultObj = {
        price: consultPrice,
        pieces_jointes: piecesJointes,
        date: new Date().toLocaleDateString('fr-FR'),
      }
      const url = await generateFSE(patientObj, doctorObj, consultObj, { debug: isDebugMode })
      if (url) {
        setGeneratedPdfUrl(url)
        toast.success('FSE téléchargée avec succès')
      }
    } catch (err) {
      console.error('Erreur génération FSE :', err)
      const message = err?.message || 'Erreur lors de la génération de la Feuille de Soins.'
      toast.error(message)
    } finally {
      setIsGenerating(false)
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
            Feuille de Soins CNSS
          </h2>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Génération automatique sur modèle officiel (FSE_CNSS) pour ce patient
          </p>
        </div>

        {/* Debug toggle + Generate button */}
        <div className="flex items-center gap-3 flex-shrink-0">
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
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isGenerating ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Download size={15} />
            )}
            <span>{isGenerating ? 'Génération...' : 'Générer PDF FSE'}</span>
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
            Complétez le dossier patient pour un résultat optimal.
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
        <div className="flex items-center gap-2 mb-1">
          <Info size={15} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Données du patient pour l'FSE
          </span>
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

      {/* Consultation fields (editable for this FSE) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
          Paramètres de la consultation
        </span>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
              Montant (MAD)
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
            <p className="text-xs font-bold text-gray-700">Aperçu de la Feuille de Soins générée :</p>
            <a
              href={generatedPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 underline font-semibold"
            >
              Ouvrir en plein écran
            </a>
          </div>
          <iframe
            src={generatedPdfUrl}
            title="CNSS FSE Aperçu"
            className="w-full h-[520px] rounded-xl border border-gray-300 shadow-inner"
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
    highlight === 'blue' ? 'text-blue-700' : highlight === 'emerald' ? 'text-emerald-700' : 'text-slate-700',
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
  // Already in DDMMYYYY format (8 digits, no separators)
  if (/^\d{8}$/.test(dateStr)) return dateStr
  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-')
    return `${d}${m}${y}`
  }
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr.replace(/\//g, '')
  }
  return dateStr
}
