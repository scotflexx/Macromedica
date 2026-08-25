import React, { useState } from 'react'
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import QRCode from 'qrcode'
import { FileText, Download, QrCode, RefreshCw, Grid } from 'lucide-react'

export default function FeuilleDeSoinsGenerator() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState(null)
  const [isDebugGridActive, setIsDebugGridActive] = useState(false)

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

  /**
   * Calibration Grid Helper
   * Draws a visual coordinate grid (dots + text labels every 50pt) across the entire width and height.
   */
  const drawCalibrationGrid = (page, font) => {
    const { width, height } = page.getSize()
    const dotColor = rgb(0.85, 0.2, 0.2) // Red grid dots
    const textColor = rgb(0.8, 0.1, 0.1)
    const lineColor = rgb(0.92, 0.7, 0.7)

    // Draw major grid lines every 100pt
    for (let x = 0; x <= width; x += 100) {
      page.drawLine({
        start: { x, y: 0 },
        end: { x, y: height },
        color: lineColor,
        thickness: 0.5
      })
    }
    for (let y = 0; y <= height; y += 100) {
      page.drawLine({
        start: { x: 0, y },
        end: { x: width, y },
        color: lineColor,
        thickness: 0.5
      })
    }

    // Draw coordinate dots and labels every 50pt
    for (let x = 0; x <= width; x += 50) {
      for (let y = 0; y <= height; y += 50) {
        page.drawCircle({ x, y, size: 1.5, color: dotColor })

        page.drawText(`${Math.round(x)},${Math.round(y)}`, {
          x: x + 2,
          y: y + 2,
          size: 6,
          font: font,
          color: textColor
        })
      }
    }
  }

  const generatePDF = async (shouldDownload = true, debugGrid = false) => {
    setIsGenerating(true)
    setIsDebugGridActive(debugGrid)
    try {
      // 1. Fetch the official CNSS template PDF from public folder
      const templateBytes = await fetch('/assets/FEUILLE-DE-SOINS-MALADIE.pdf').then((res) => {
        if (!res.ok) throw new Error("Could not find /assets/FEUILLE-DE-SOINS-MALADIE.pdf")
        return res.arrayBuffer()
      })

      // 2. Load the PDF with pdf-lib
      const pdfDoc = await PDFDocument.load(templateBytes)
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const pages = pdfDoc.getPages()
      const page1 = pages[0] // Front Page
      const page2 = pages[1] // Back Page (Actes)

      // Reset internal Rotation metadata to 0 degrees for upright visual orientation
      pages.forEach((p) => {
        if (p.getRotation().angle !== 0) {
          p.setRotation(degrees(0))
        }
      })

      // If Debug Grid mode is requested, draw calibration grid and skip/overlay text
      if (debugGrid) {
        drawCalibrationGrid(page1, fontRegular)
        if (page2) drawCalibrationGrid(page2, fontRegular)
      } else {
        const color = rgb(0.1, 0.1, 0.2) // Clean dark blue/charcoal for stamped feel

        // Helper function to draw spaced digits into boxed fields
        const drawBoxedText = (page, text, startX, y, spacing = 14, fontSize = 9) => {
          if (!text) return
          const clean = text.replace(/[^a-zA-Z0-9]/g, '')
          for (let i = 0; i < clean.length; i++) {
            page.drawText(clean[i], {
              x: startX + i * spacing,
              y: y,
              size: fontSize,
              font: font,
              color: color,
            })
          }
        }

        // ==========================================
        // PAGE 1: INFORMATIONS PATIENT & PRATICIEN
        // ==========================================
        page1.drawText(mockData.assure.nomPrenom, { x: 340, y: 685, size: 9, font })
        drawBoxedText(page1, mockData.assure.immatriculation, 375, 663, 14.2)
        drawBoxedText(page1, mockData.assure.cin, 385, 642, 14.5)
        page1.drawText(mockData.assure.adresse, { x: 330, y: 600, size: 8, font: fontRegular })
        page1.drawText(mockData.assure.montantTotal, { x: 360, y: 580, size: 9, font })
        page1.drawText(mockData.assure.nombrePieces, { x: 340, y: 562, size: 9, font })

        // Bénéficiaire de soins
        page1.drawText(mockData.beneficiaire.nomPrenom, { x: 340, y: 498, size: 9, font })
        drawBoxedText(page1, mockData.beneficiaire.dateNaissance, 360, 478, 14)
        drawBoxedText(page1, mockData.beneficiaire.cin, 385, 458, 14.5)

        // Checkbox Sexe (M / F)
        if (mockData.beneficiaire.sexe === 'M') {
          page1.drawText('X', { x: 442, y: 438, size: 10, font })
        } else {
          page1.drawText('X', { x: 482, y: 438, size: 10, font })
        }

        // Checkbox Type de soins (Maladie)
        if (mockData.consultation.typeSoins === 'Maladie') {
          page1.drawText('X', { x: 512, y: 365, size: 10, font })
        }

        // INPE & Doctor declaration
        page1.drawText(mockData.consultation.inpe, { x: 340, y: 418, size: 9, font })
        page1.drawText(mockData.consultation.ville, { x: 425, y: 325, size: 8, font })
        page1.drawText(mockData.consultation.date, { x: 345, y: 325, size: 8, font })

        // FSE QR Code (Top Right Page 1)
        const qrPayload = JSON.stringify({
          fse_ver: "1.0",
          inpe: mockData.consultation.inpe,
          patient_cin: mockData.beneficiaire.cin,
          immat: mockData.assure.immatriculation,
          date: mockData.consultation.date,
          total: mockData.assure.montantTotal,
        })

        const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 120 })
        const qrImage = await pdfDoc.embedPng(qrDataUrl)
        page1.drawImage(qrImage, {
          x: 485,
          y: 730,
          width: 65,
          height: 65,
        })

        // ==========================================
        // PAGE 2: DESCRIPTION DES ACTES EFFECTUÉS
        // ==========================================
        if (page2 && mockData.actes.length > 0) {
          let currentY = 700
          mockData.actes.forEach((acte) => {
            page2.drawText(acte.date, { x: 35, y: currentY, size: 8, font: fontRegular })
            page2.drawText(acte.code, { x: 120, y: currentY, size: 8, font })
            page2.drawText(acte.cotation, { x: 180, y: currentY, size: 8, font })
            page2.drawText(`${acte.montant} DH`, { x: 245, y: currentY, size: 8, font })
            page2.drawText(`INPE: ${acte.inpe}`, { x: 340, y: currentY, size: 7, font: fontRegular })
            currentY -= 35
          })
        }
      }

      // 4. Save and export PDF
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const blobUrl = URL.createObjectURL(blob)
      setGeneratedPdfUrl(blobUrl)

      if (shouldDownload) {
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = debugGrid
          ? `FEUILLE-DE-SOINS-DEBUG-GRID.pdf`
          : `Feuille_De_Soins_${mockData.beneficiaire.nomPrenom.replace(/\s+/g, '_')}.pdf`
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
              Génère le document réglementaire 2 pages sur le modèle officiel avec QR Code FSE estampillé.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Print Debug Grid Button */}
          <button
            onClick={() => generatePDF(true, true)}
            disabled={isGenerating}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
            title="Générer la grille de calibration (x,y every 50px) pour ajuster le positionnement"
          >
            <Grid size={15} />
            <span>Print Debug Grid</span>
          </button>

          {/* Standard Download PDF Button */}
          <button
            onClick={() => generatePDF(true, false)}
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
      </div>

      {generatedPdfUrl && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-700">
              Aperçu en direct: {isDebugGridActive ? '📐 GRILLE DE CALIBRATION DEBUG (X, Y tous les 50px)' : 'Modèle Officiel Estampillé (2 Pages)'}
            </p>
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
