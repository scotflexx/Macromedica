import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AiLabReaderCard() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setSummary('')
      setError('')
    }
  }

  async function analyzeDocument() {
    if (!file) return
    setLoading(true)
    setError('')
    setSummary('')

    try {
      // Simulation du processus : 
      // 1. Upload vers Supabase Storage
      // 2. Appel de l'Edge Function 'ai-ocr' avec le lien du fichier
      
      await new Promise(resolve => setTimeout(resolve, 2000)) // Fausse attente de 2s

      // Réponse codée en dur pour ta démo (en attendant d'activer OpenAI Vision)
      setSummary(`📄 Bilan Sanguin détecté (Laboratoire d'analyses)
Date du prélèvement : 01/04/2026

⚠️ ANOMALIES DÉTECTÉES :
- Glycémie à jeun : 1.25 g/L (Légèrement élevée - Limite pré-diabète)
- Cholestérol LDL : 1.80 g/L (Élevé - Objectif < 1.15 g/L)

✅ VALEURS NORMALES :
- Hémogramme (NFS) : Sans anomalie
- Fonction rénale (Créatinine, Urée) : Normale
- Transaminases (ASAT/ALAT) : Normales

💡 Synthèse IA : Patient présentant un risque métabolique modéré. Une surveillance de l'HbA1c et un régime hygiéno-diététique sont recommandés.`)

    } catch (err: any) {
      setError("Erreur lors de l'analyse du document.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Agent IA — Lecteur de Bilans</h2>
          <p className="text-sm text-gray-500">Extrait les anomalies des analyses de laboratoire (PDF/Images)</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".pdf,image/*"
            onChange={handleFileChange}
          />
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              {file ? file.name : "Cliquez pour importer un PDF ou une photo"}
            </span>
            <span className="text-xs text-gray-500">Format accepté : PDF, JPG, PNG</span>
          </label>
        </div>

        <button
          onClick={analyzeDocument}
          disabled={loading || !file}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors font-medium text-sm flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Lecture IA en cours...
            </>
          ) : (
            "Analyser le document"
          )}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mt-4 p-3 bg-red-50 rounded-lg">{error}</p>}

      {summary && (
        <div className="mt-6 bg-blue-50 rounded-lg p-5 border border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500"/>
            <span className="text-sm font-bold text-blue-800">Extraction Terminée</span>
          </div>
          <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">{summary}</p>
          <button className="mt-4 w-full py-2 bg-white border border-blue-200 text-blue-700 rounded-lg text-sm hover:bg-blue-50 transition-colors font-medium">
            Ajouter cette synthèse au dossier patient
          </button>
        </div>
      )}
    </div>
  )
}