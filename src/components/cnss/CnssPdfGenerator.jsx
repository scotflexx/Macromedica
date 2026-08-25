import React, { useState } from 'react'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'
import { FileText, Download, QrCode, Sparkles, CheckCircle2, ShieldCheck, RefreshCw, Printer } from 'lucide-react'

/**
 * STRUCTURED CONFIGURATION DICTIONARY FOR PDF COORDINATES (X, Y)
 * Note: pdf-lib uses bottom-left as origin (X: 0, Y: 0). Standard A4 is 595.28 x 841.89 pt.
 * Adjust coordinates here if your base PDF template alignment differs.
 */
export const CNSS_PDF_COORDINATES = {
  // Page 1: Top Header, Assuré, Beneficiaire & Doctor INPE
  page1: {
    // Top-Right FSE QR Code Container
    qrCodeFSE: { x: 465, y: 735, width: 85, height: 85 },

    // Assuré Fields
    nomPrenomAssure: { x: 380, y: 722, fontSize: 10 },
    numImmatriculation: { x: 400, y: 698, fontSize: 10 },
    numCin: { x: 410, y: 678, fontSize: 10 },
    adresseAssure: { x: 120, y: 645, fontSize: 9 },

    // Montant Total des frais (Top Section)
    montantTotalDhs: { x: 420, y: 618, fontSize: 11 },

    // Bénéficiaire Fields
    nomPrenomBeneficiaire: { x: 380, y: 535, fontSize: 10 },
    dateNaissanceBeneficiaire: { x: 410, y: 512, fontSize: 10 },
    cinBeneficiaire: { x: 410, y: 492, fontSize: 10 },
    sexeBeneficiaire: { x: 340, y: 472, fontSize: 11 }, // 'M' or 'F'

    // Médecin Traitant & INPE
    inpeCodeBarres: { x: 370, y: 442, fontSize: 10 },
    nomMedecinTraitant: { x: 180, y: 395, fontSize: 10 },
    etablissementSoins: { x: 380, y: 395, fontSize: 10 },

    // Signature & Date Block
    faitA: { x: 440, y: 260, fontSize: 9 },
    faitLe: { x: 420, y: 242, fontSize: 9 }
  },

  // Page 2: Description des Actes (NGAP, Cotation, Montant)
  page2: {
    inpePrestataire: { x: 120, y: 645, fontSize: 10 },
    actes: [
      { date: { x: 60, y: 730 }, code: { x: 115, y: 730 }, ngap: { x: 165, y: 730 }, montant: { x: 215, y: 730 }, fontSize: 10 },
      { date: { x: 60, y: 710 }, code: { x: 115, y: 710 }, ngap: { x: 165, y: 710 }, montant: { x: 215, y: 710 }, fontSize: 10 }
    ],
    totalMontantFacture: { x: 215, y: 565, fontSize: 11 }
  }
}

export default function CnssPdfGenerator({ templateUrl = '/templates/cnss_feuille_soins.pdf' }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState(null)
  const [qrPreviewUrl, setQrPreviewUrl] = useState(null)

  // Editable Form State with Mock CNSS Data
  const [formData, setFormData] = useState({
    patientName: 'Meryem Tazi',
    patientCin: 'AB-88419',
    numImmatriculation: '123456789',
    inpe: '1-9-1-0-2-3-4-5-6-7-8-9-0-1-2',
    doctorName: 'Dr. Othmane Touggani',
    ngapCode: 'C x 1 (Consultation Spécialiste)',
    actesDate: '25/08/2026',
    totalPrice: '150.00 Dhs',
    city: 'Casablanca'
  })

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // FSE JSON Payload format
  const getFseJsonPayload = () => ({
    fseVersion: '1.0',
    cnssRef: '610-1-02',
    patientName: formData.patientName,
    patientCin: formData.patientCin,
    immatriculation: formData.numImmatriculation,
    inpe: formData.inpe.replace(/[^0-9]/g, ''),
    dateActes: formData.actesDate,
    ngap: formData.ngapCode,
    totalPrice: formData.totalPrice,
    timestamp: new Date().toISOString()
  })

  /**
   * Helper to draw text or AcroForm fields
   */
  const injectFormDataIntoPdf = async (pdfDoc, helveticaFont, qrPngImage) => {
    const pages = pdfDoc.getPages()
    const page1 = pages[0] || pdfDoc.addPage([595.28, 841.89])
    const page2 = pages[1] || pdfDoc.addPage([595.28, 841.89])

    const c1 = CNSS_PDF_COORDINATES.page1
    const c2 = CNSS_PDF_COORDINATES.page2
    const textColor = rgb(0.1, 0.1, 0.2)
    const primaryColor = rgb(0.05, 0.35, 0.75)

    // Check if AcroForm exists
    try {
      const form = pdfDoc.getForm()
      const fields = form.getFields()

      if (fields && fields.length > 0) {
        // If template contains AcroForm fields
        try { form.getTextField('nom_assure')?.setText(formData.patientName) } catch {}
        try { form.getTextField('inpe')?.setText(formData.inpe) } catch {}
        try { form.getTextField('ngap')?.setText(formData.ngapCode) } catch {}
        try { form.getTextField('date_actes')?.setText(formData.actesDate) } catch {}
        try { form.getTextField('montant_total')?.setText(formData.totalPrice) } catch {}
      }
    } catch {
      // PDF has no AcroForm fields -> Use exact drawText coordinate mapping
    }

    // 1. Draw FSE QR Code (Top Right Corner)
    if (qrPngImage) {
      page1.drawImage(qrPngImage, {
        x: c1.qrCodeFSE.x,
        y: c1.qrCodeFSE.y,
        width: c1.qrCodeFSE.width,
        height: c1.qrCodeFSE.height
      })
    }

    // 2. Draw Page 1 Fields
    page1.drawText(formData.patientName, { x: c1.nomPrenomAssure.x, y: c1.nomPrenomAssure.y, size: c1.nomPrenomAssure.fontSize, font: helveticaFont, color: textColor })
    page1.drawText(formData.numImmatriculation, { x: c1.numImmatriculation.x, y: c1.numImmatriculation.y, size: c1.numImmatriculation.fontSize, font: helveticaFont, color: textColor })
    page1.drawText(formData.patientCin, { x: c1.numCin.x, y: c1.numCin.y, size: c1.numCin.fontSize, font: helveticaFont, color: textColor })
    page1.drawText(formData.totalPrice, { x: c1.montantTotalDhs.x, y: c1.montantTotalDhs.y, size: c1.montantTotalDhs.fontSize, font: helveticaFont, color: primaryColor })

    page1.drawText(formData.patientName, { x: c1.nomPrenomBeneficiaire.x, y: c1.nomPrenomBeneficiaire.y, size: c1.nomPrenomBeneficiaire.fontSize, font: helveticaFont, color: textColor })
    page1.drawText(formData.patientCin, { x: c1.cinBeneficiaire.x, y: c1.cinBeneficiaire.y, size: c1.cinBeneficiaire.fontSize, font: helveticaFont, color: textColor })

    page1.drawText(formData.inpe, { x: c1.inpeCodeBarres.x, y: c1.inpeCodeBarres.y, size: c1.inpeCodeBarres.fontSize, font: helveticaFont, color: textColor })
    page1.drawText(formData.doctorName, { x: c1.nomMedecinTraitant.x, y: c1.nomMedecinTraitant.y, size: c1.nomMedecinTraitant.fontSize, font: helveticaFont, color: textColor })

    page1.drawText(formData.city, { x: c1.faitA.x, y: c1.faitA.y, size: c1.faitA.fontSize, font: helveticaFont, color: textColor })
    page1.drawText(formData.actesDate, { x: c1.faitLe.x, y: c1.faitLe.y, size: c1.faitLe.fontSize, font: helveticaFont, color: textColor })

    // 3. Draw Page 2 Actes & NGAP Table
    page2.drawText(formData.inpe, { x: c2.inpePrestataire.x, y: c2.inpePrestataire.y, size: c2.inpePrestataire.fontSize, font: helveticaFont, color: textColor })

    const acteRow1 = c2.actes[0]
    page2.drawText(formData.actesDate, { x: acteRow1.date.x, y: acteRow1.date.y, size: acteRow1.fontSize, font: helveticaFont, color: textColor })
    page2.drawText('C', { x: acteRow1.code.x, y: acteRow1.code.y, size: acteRow1.fontSize, font: helveticaFont, color: textColor })
    page2.drawText(formData.ngapCode, { x: acteRow1.ngap.x, y: acteRow1.ngap.y, size: acteRow1.fontSize, font: helveticaFont, color: textColor })
    page2.drawText(formData.totalPrice, { x: acteRow1.montant.x, y: acteRow1.montant.y, size: acteRow1.fontSize, font: helveticaFont, color: primaryColor })

    page2.drawText(formData.totalPrice, { x: c2.totalMontantFacture.x, y: c2.totalMontantFacture.y, size: c2.totalMontantFacture.fontSize, font: helveticaFont, color: primaryColor })
  }

  /**
   * Main PDF Generation Handler
   */
  const handleGeneratePdf = async (shouldDownload = false) => {
    setIsGenerating(true)
    try {
      // 1. Generate QR Code Data URL from FSE JSON payload
      const payloadObj = getFseJsonPayload()
      const qrDataUrl = await QRCode.toDataURL(JSON.stringify(payloadObj), {
        width: 300,
        margin: 1,
        color: { dark: '#002B49', light: '#FFFFFF' }
      })
      setQrPreviewUrl(qrDataUrl)

      let pdfDoc

      // 2. Attempt to load template or create fallback CNSS document
      try {
        const response = await fetch(templateUrl)
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          pdfDoc = await PDFDocument.load(arrayBuffer)
        } else {
          throw new Error('Template file not found at URL')
        }
      } catch {
        // Fallback: Create structured 2-page PDF document
        pdfDoc = await PDFDocument.create()
        const page1 = pdfDoc.addPage([595.28, 841.89])
        const page2 = pdfDoc.addPage([595.28, 841.89])

        // Draw header watermark & frame lines for visual clarity
        page1.drawRectangle({ x: 20, y: 780, width: 555, height: 45, color: rgb(0.95, 0.97, 1) })
        page1.drawText('ROYAUME DU MAROC - CNSS FEUILLE DE SOINS MALADIE (Réf 610-1-02)', { x: 30, y: 798, size: 12, color: rgb(0, 0.3, 0.7) })
        page1.drawText('Système FSE - Feuille de Soins Électronique', { x: 30, y: 785, size: 9, color: rgb(0.4, 0.4, 0.4) })

        page2.drawRectangle({ x: 20, y: 780, width: 555, height: 45, color: rgb(0.95, 0.97, 1) })
        page2.drawText('DESCRIPTION DES ACTES EFFECTUÉS (NGAP / CIM-10)', { x: 30, y: 798, size: 12, color: rgb(0, 0.3, 0.7) })
      }

      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const qrPngImage = await pdfDoc.embedPng(qrDataUrl)

      // 3. Inject mock data using coordinate dictionary
      await injectFormDataIntoPdf(pdfDoc, helveticaFont, qrPngImage)

      // 4. Export PDF
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const blobUrl = URL.createObjectURL(blob)
      setGeneratedPdfUrl(blobUrl)

      // 5. Trigger download if requested
      if (shouldDownload) {
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = `CNSS_Feuille_De_Soins_${formData.patientName.replace(/\s+/g, '_')}_FSE.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err) {
      console.error('Error generating CNSS PDF:', err)
      alert(`Erreur lors de la génération du PDF CNSS: ${err.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold">
            <FileText size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Générateur CNSS Feuille de Soins FSE</h2>
              <span className="bg-emerald-50 text-emerald-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
                pdf-lib & QR Code
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Formulaire Officiel CNSS (Réf 610-1-02) avec injection QR Code pour la FSE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleGeneratePdf(true)}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
          >
            {isGenerating ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Download size={15} />
            )}
            <span>Télécharger le PDF CNSS</span>
          </button>
        </div>
      </div>

      {/* Form Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200/80">
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">Nom Assuré / Patient:</label>
          <input
            type="text"
            value={formData.patientName}
            onChange={(e) => handleInputChange('patientName', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">N° CIN Patient:</label>
          <input
            type="text"
            value={formData.patientCin}
            onChange={(e) => handleInputChange('patientCin', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">N° INPE Médecin:</label>
          <input
            type="text"
            value={formData.inpe}
            onChange={(e) => handleInputChange('inpe', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">Code NGAP / Actes:</label>
          <input
            type="text"
            value={formData.ngapCode}
            onChange={(e) => handleInputChange('ngapCode', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">Date des Actes:</label>
          <input
            type="text"
            value={formData.actesDate}
            onChange={(e) => handleInputChange('actesDate', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">Montant Total Facturé:</label>
          <input
            type="text"
            value={formData.totalPrice}
            onChange={(e) => handleInputChange('totalPrice', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">N° Immatriculation CNSS:</label>
          <input
            type="text"
            value={formData.numImmatriculation}
            onChange={(e) => handleInputChange('numImmatriculation', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">Ville / Fait à:</label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* QR Code FSE & Payload Preview */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* FSE QR Code Preview Card */}
        <div className="md:col-span-4 bg-slate-900 text-white rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <QrCode size={16} />
            <span>Aperçu QR Code FSE</span>
          </div>

          {qrPreviewUrl ? (
            <img src={qrPreviewUrl} alt="FSE QR Code" className="w-28 h-28 bg-white p-1 rounded-lg border border-slate-700" />
          ) : (
            <div className="w-28 h-28 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-xs text-slate-500">
              Générer pour aperçu
            </div>
          )}

          <p className="text-[10px] text-slate-300">
            Intégré au coin supérieur droit (X: {CNSS_PDF_COORDINATES.page1.qrCodeFSE.x}, Y: {CNSS_PDF_COORDINATES.page1.qrCodeFSE.y})
          </p>
        </div>

        {/* FSE JSON Payload Details */}
        <div className="md:col-span-8 bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto space-y-1">
          <div className="text-[11px] font-sans font-bold text-slate-300 uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
            Payload JSON Encoder dans le QR Code FSE:
          </div>
          <pre>{JSON.stringify(getFseJsonPayload(), null, 2)}</pre>
        </div>
      </div>

      {/* Live PDF Viewer or Preview Frame */}
      {generatedPdfUrl && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs font-bold text-gray-800">
            <span>Aperçu en direct du Document PDF CNSS Complété:</span>
            <a
              href={generatedPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:text-blue-800 text-xs underline"
            >
              Ouvrir dans un nouvel onglet
            </a>
          </div>
          <iframe
            src={generatedPdfUrl}
            title="CNSS PDF Preview"
            className="w-full h-96 rounded-xl border border-gray-300 shadow-inner"
          />
        </div>
      )}
    </div>
  )
}
