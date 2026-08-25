import React, { useState } from 'react'
import { FileText, Download, RefreshCw } from 'lucide-react'
import { fillFeuilleDeSoins } from './fillFeuilleDeSoins'

export default function FeuilleDeSoinsGenerator() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState(null)

  // Sample data to inject into the CNSS template
  const mockData = {
    // Page 1: Assuré & Bénéficiaire
    assure: {
      nomPrenom: 'TAZI MERYEM',
      immatriculation: '123456789',
      cin: 'AB88419',
      adresse: 'Casablanca, Maroc',
      montantTotal: '150.00',
      nombrePieces: '1',
    },
    beneficiaire: {
      nomPrenom: 'TAZI MERYEM',
      dateNaissance: '14/05/1998',
      cin: 'AB88419',
      sexe: 'F', // 'M' or 'F'
      isConjoint: false,
      isEnfant: false,
    },
    consultation: {
      typeSoins: 'Maladie', // 'Maladie', 'Accident', 'Maternite', 'Hospitalisation'
      ville: 'Casablanca',
      date: '25/08/2026',
      medecinNom: 'Dr. Othmane Touggani',
      inpe: '191023456',
    },
    // Page 2: Description des actes effectués (NGAP)
    actes: [
      {
        date: '25/08/2026',
        code: 'CS',
        cotation: 'C x 1',
        montant: '150.00',
        inpe: '191023456',
      },
    ],
  }

  const generatePDF = async (shouldDownload = true) => {
    setIsGenerating(true)
    try {
      // Execute rotation-aware PDF fill logic
      const pdfBytes = await fillFeuilleDeSoins(mockData)

      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const blobUrl = URL.createObjectURL(blob)
      setGeneratedPdfUrl(blobUrl)

      if (shouldDownload) {
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = `Feuille_De_Soins_${mockData.beneficiaire.nomPrenom.replace(/\s+/g, '_')}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err) {
      console.error('Error generating Feuille de Soins:', err)
      alert('Erreur lors de la génération du PDF. Vérifiez que le fichier modèle est dans /public/assets/.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="p-6 border border-gray-200 rounded-2xl bg-white shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold">
            <FileText size={22} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">Génération Feuille de Soins CNSS (Officielle)</h3>
            <p className="text-xs text-gray-500 font-medium">
              Document réglementaire 2 pages estampillé avec QR Code FSE et rotation préservée sans setRotation().
            </p>
          </div>
        </div>

        <button
          onClick={() => generatePDF(true)}
          disabled={isGenerating}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
        >
          {isGenerating ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Download size={15} />
          )}
          <span>{isGenerating ? 'Génération en cours...' : 'Imprimer Feuille de Soins (PDF)'}</span>
        </button>
      </div>

      {generatedPdfUrl && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-700">Aperçu en direct du Modèle Officiel Estampillé (Orientation Parfaite):</p>
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
