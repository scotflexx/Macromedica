import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'

export async function fillFeuilleDeSoins(data) {
  // 1. Fetch template
  const existingPdfBytes = await fetch('/assets/FEUILLE-DE-SOINS-MALADIE.pdf').then((res) => {
    if (!res.ok) throw new Error('Could not find /assets/FEUILLE-DE-SOINS-MALADIE.pdf')
    return res.arrayBuffer()
  })

  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const pages = pdfDoc.getPages()
  const page1 = pages[0]
  const page2 = pages[1]

  const pageRotation = page1.getRotation().angle
  const textColor = rgb(0.1, 0.1, 0.2)

  // Helper to draw text matching the visual orientation without setRotation()
  const drawVisualText = (page, text, x, y, size = 9, isBold = true) => {
    if (!text) return

    // If page is rotated 90 degrees internally
    if (pageRotation === 90) {
      page.drawText(String(text), {
        x: y,
        y: page.getWidth() - x,
        size,
        font: isBold ? fontBold : fontRegular,
        color: textColor,
        rotate: degrees(-90),
      })
    } else if (pageRotation === 270) {
      page.drawText(String(text), {
        x: page.getHeight() - y,
        y: x,
        size,
        font: isBold ? fontBold : fontRegular,
        color: textColor,
        rotate: degrees(90),
      })
    } else {
      // Standard 0 degrees
      page.drawText(String(text), {
        x,
        y,
        size,
        font: isBold ? fontBold : fontRegular,
        color: textColor,
      })
    }
  }

  // Helper for boxed character cells (CIN, Immatriculation)
  const drawVisualBoxes = (page, text, startX, y, boxSpacing = 13.5, size = 9) => {
    if (!text) return
    const clean = String(text).replace(/[^a-zA-Z0-9]/g, '')
    for (let i = 0; i < clean.length; i++) {
      drawVisualText(page, clean[i], startX + i * boxSpacing, y, size, true)
    }
  }

  // ==========================================
  // PAGE 1: DONNÉES PATIENT & MÉDECIN
  // ==========================================
  // 1. Partie réservée à l'assuré(e)
  drawVisualText(page1, data.assure.nomPrenom, 350, 700, 9)
  drawVisualBoxes(page1, data.assure.immatriculation, 372, 678, 13.6)
  drawVisualBoxes(page1, data.assure.cin, 382, 658, 13.8)
  drawVisualText(page1, data.assure.adresse, 335, 615, 8, false)
  drawVisualText(page1, `${data.assure.montantTotal} DH`, 365, 595, 9)
  drawVisualText(page1, data.assure.nombrePieces || '1', 345, 575, 9)

  // 2. Bénéficiaire de soins
  drawVisualText(page1, data.beneficiaire.nomPrenom, 350, 532, 9)
  drawVisualBoxes(page1, data.beneficiaire.dateNaissance, 362, 512, 13.6)
  drawVisualBoxes(page1, data.beneficiaire.cin, 382, 492, 13.8)

  // Cocher Sexe
  if (data.beneficiaire.sexe === 'M') {
    drawVisualText(page1, 'X', 498, 473, 10)
  } else {
    drawVisualText(page1, 'X', 440, 473, 10)
  }

  // Cocher Type de soins (Maladie)
  drawVisualText(page1, 'X', 510, 408, 10)

  // Praticien / INPE
  drawVisualBoxes(page1, data.consultation.inpe, 375, 452, 13.6)
  drawVisualText(page1, data.consultation.ville, 435, 358, 8)
  drawVisualText(page1, data.consultation.date, 355, 358, 8)

  // 3. FSE QR Code (Top Right Page 1)
  try {
    const qrPayload = JSON.stringify({
      fse_ver: "1.0",
      inpe: data.consultation.inpe,
      patient_cin: data.beneficiaire.cin,
      immat: data.assure.immatriculation,
      date: data.consultation.date,
      total: data.assure.montantTotal,
    })

    const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 120 })
    const qrImage = await pdfDoc.embedPng(qrDataUrl)

    if (pageRotation === 270) {
      page1.drawImage(qrImage, {
        x: page1.getHeight() - 730,
        y: 485,
        width: 65,
        height: 65,
        rotate: degrees(90),
      })
    } else if (pageRotation === 90) {
      page1.drawImage(qrImage, {
        x: 730,
        y: page1.getWidth() - 485,
        width: 65,
        height: 65,
        rotate: degrees(-90),
      })
    } else {
      page1.drawImage(qrImage, {
        x: 485,
        y: 730,
        width: 65,
        height: 65,
      })
    }
  } catch (e) {
    console.warn('QR Code generation skipped:', e)
  }

  // ==========================================
  // PAGE 2: ACTES MÉDICAUX (NGAP)
  // ==========================================
  if (page2 && data.actes && data.actes.length > 0) {
    let actY = 665
    data.actes.forEach((acte) => {
      drawVisualText(page2, acte.date, 55, actY, 8, false)
      drawVisualText(page2, acte.code, 130, actY, 8, true)
      drawVisualText(page2, acte.cotation, 190, actY, 8, true)
      drawVisualText(page2, `${acte.montant} DH`, 255, actY, 8, true)
      drawVisualText(page2, `INPE: ${acte.inpe}`, 360, actY, 7, false)
      actY -= 22
    })
  }

  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}
