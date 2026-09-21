import React, { useState } from 'react'
import { FileText, Download, RefreshCw, UserCheck, Shuffle } from 'lucide-react'
import { generateFSE, mockPatients, mockPatientsEdgeCases } from './generateFSE'

export default function FeuilleDeSoinsGenerator() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState(null)
  const [isDebugMode, setIsDebugMode] = useState(false)
  const [selectedPatientIndex, setSelectedPatientIndex] = useState(0)

  const allMockPatients = [...mockPatients, ...mockPatientsEdgeCases]
  const currentPatient = allMockPatients[selectedPatientIndex] || allMockPatients[0]

  const mockDoctor = {
    name: 'Dr. Othmane Touggani',
    specialty: 'Médecine Générale',
    inpe_code: '191023456',
    city: 'Casablanca',
    etablissement: 'Cabinet Médical Touggani',
  }

  const mockConsultation = {
    price: currentPatient?.montant ? String(currentPatient.montant) : '150.00',
    pieces_jointes: currentPatient?.piecesJointes ? String(currentPatient.piecesJointes) : '1',
    date: new Date().toLocaleDateString('fr-FR'),
  }

  const handleGenerate = async (patientToUse = currentPatient, debug = isDebugMode) => {
    setIsGenerating(true)
    try {
      const patientObj = {
        first_name: patientToUse.first_name || patientToUse.nomComplet?.split(' ')[0] || 'Patient',
        last_name: patientToUse.last_name || patientToUse.nomComplet?.split(' ').slice(1).join(' ') || '',
        nomComplet: patientToUse.nomComplet,
        cin: patientToUse.cin,
        cnss_number: patientToUse.immatriculation || patientToUse.cnss_number,
        immatriculation: patientToUse.immatriculation || patientToUse.cnss_number,
        date_of_birth: patientToUse.dateNaissance || patientToUse.date_of_birth,
        dateNaissance: patientToUse.dateNaissance || patientToUse.date_of_birth,
        gender: patientToUse.sexe || patientToUse.gender,
        sexe: patientToUse.sexe || patientToUse.gender,
        address: patientToUse.adresse || patientToUse.address,
        adresse: patientToUse.adresse || patientToUse.address,
        montant: patientToUse.montant,
        piecesJointes: patientToUse.piecesJointes || patientToUse.pieces_jointes || 1,
      }

      const consultObj = {
        price: patientToUse?.montant ? String(patientToUse.montant) : '150.00',
        pieces_jointes: patientToUse?.piecesJointes ? String(patientToUse.piecesJointes) : '1',
        date: new Date().toLocaleDateString('fr-FR'),
      }

      const url = await generateFSE(patientObj, mockDoctor, consultObj, { debug })
      if (url) setGeneratedPdfUrl(url)
    } catch (err) {
      console.error('Error generating FSE:', err)
      alert('Erreur lors de la génération de la Feuille de Soins.')
    } finally {
      setIsGenerating(false)
    }
  }

  const selectRandomPatient = () => {
    const randomIndex = Math.floor(Math.random() * allMockPatients.length)
    setSelectedPatientIndex(randomIndex)
    handleGenerate(allMockPatients[randomIndex], isDebugMode)
  }

  return (
    <div className="p-6 border border-gray-200 rounded-2xl bg-white shadow-sm space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold">
            <FileText size={22} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">Génération Feuille de Soins CNSS</h3>
            <p className="text-xs text-gray-500 font-medium">
              Génération automatique sur modèle officiel (FSE_CNSS) avec toutes les informations requises (Nom, CIN, Immatriculation, Date, Adresse).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer select-none bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
            <input
              type="checkbox"
              checked={isDebugMode}
              onChange={(e) => {
                const val = e.target.checked
                setIsDebugMode(val)
                if (generatedPdfUrl) handleGenerate(currentPatient, val)
              }}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>Mode Repères (Debug)</span>
          </label>

          <button
            onClick={() => handleGenerate(currentPatient, isDebugMode)}
            disabled={isGenerating}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Download size={15} />
            )}
            <span>{isGenerating ? 'Génération en cours...' : 'Imprimer Feuille de Soins (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Patient Selection & Data Details Panel */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-blue-600" />
            <label htmlFor="patient-select" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Patient sélectionné pour l'FSE :
            </label>
          </div>
          <div className="flex items-center gap-2">
            <select
              id="patient-select"
              value={selectedPatientIndex}
              onChange={(e) => {
                const idx = Number(e.target.value)
                setSelectedPatientIndex(idx)
                handleGenerate(allMockPatients[idx], isDebugMode)
              }}
              className="bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              {allMockPatients.map((p, index) => (
                <option key={p.id || index} value={index}>
                  {p.nomComplet} — CIN: {p.cin} ({p.ville || p.adresse?.split(',')[0] || 'Maroc'})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={selectRandomPatient}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition"
              title="Choisir un patient aléatoire et régénérer"
            >
              <Shuffle size={13} />
              <span>Aléatoire</span>
            </button>
          </div>
        </div>

        {/* Info Grid for Selected Patient */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1 text-xs">
          <div className="bg-white p-2 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Nom & Prénom</span>
            <span className="font-semibold text-slate-800 truncate block">{currentPatient.nomComplet}</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">N° CIN</span>
            <span className="font-mono font-bold text-blue-700 block">{currentPatient.cin}</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Immatriculation CNSS</span>
            <span className="font-mono font-bold text-emerald-700 block">{currentPatient.immatriculation || currentPatient.cnss_number}</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Date de Naissance</span>
            <span className="font-medium text-slate-700 block">{currentPatient.date_of_birth || currentPatient.dateNaissance}</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Sexe</span>
            <span className="font-bold text-slate-700 block">{currentPatient.sexe === 'F' ? 'Femme (F)' : 'Homme (M)'}</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Montant Consultation</span>
            <span className="font-bold text-amber-700 block">{currentPatient.montant || 150} MAD</span>
          </div>
          <div className="col-span-2 sm:col-span-4 md:col-span-6 bg-white p-2 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Adresse Complète</span>
            <span className="text-slate-700 truncate block">{currentPatient.adresse || currentPatient.address}</span>
          </div>
        </div>
      </div>

      {generatedPdfUrl && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-700">Aperçu en direct de la Feuille de Soins générée :</p>
            <a href={generatedPdfUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline font-semibold">
              Ouvrir le PDF plein écran
            </a>
          </div>
          <iframe
            src={generatedPdfUrl}
            title="CNSS PDF Official Preview"
            className="w-full h-[520px] rounded-xl border border-gray-300 shadow-inner"
          />
        </div>
      )}
    </div>
  )
}
