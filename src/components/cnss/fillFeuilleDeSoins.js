import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'

export async function fillFeuilleDeSoins(data) {
  // 1. Create a brand new PDF document
  const pdfDoc = await PDFDocument.create()
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const textColor = rgb(0.1, 0.1, 0.2)

  // 2. Fetch and embed the flat background images
  const page1ImageBytes = await fetch('/assets/cnss-page1.jpg').then(res => res.arrayBuffer())
  const page2ImageBytes = await fetch('/assets/cnss-page2.jpg').then(res => res.arrayBuffer())

  const bg1 = await pdfDoc.embedJpg(page1ImageBytes)
  const bg2 = await pdfDoc.embedJpg(page2ImageBytes)

  // 3. Create pristine A4 pages ([595.28, 841.89])
  const page1 = pdfDoc.addPage([595.28, 841.89])
  const page2 = pdfDoc.addPage([595.28, 841.89])

  // 4. Draw the backgrounds
  page1.drawImage(bg1, { x: 0, y: 0, width: 595.28, height: 841.89 })
  page2.drawImage(bg2, { x: 0, y: 0, width: 595.28, height: 841.89 })

  // 5. Draw text with absolute confidence (No rotation logic needed)
  const drawText = (page, text, x, y, size = 9, isBold = true) => {
    if (!text) return
    page.drawText(String(text), {
      x,
      y,
      size,
      font: isBold ? fontBold : fontRegular,
      color: textColor
    })
  }

  const drawBoxes = (page, text, startX, y, spacing = 13.5, size = 9) => {
    if (!text) return
    const clean = String(text).replace(/[^a-zA-Z0-9]/g, '')
    for (let i = 0; i < clean.length; i++) {
      drawText(page, clean[i], startX + (i * spacing), y, size, true)
    }
  }

  // ==========================================
  // PAGE 1: DONNÉES PATIENT & MÉDECIN
  // ==========================================
  // Partie réservée à l'assuré(e)
  drawText(page1, data.assure?.nomPrenom, 350, 680, 9)
  drawBoxes(page1, data.assure?.immatriculation, 372, 655, 14)
  drawBoxes(page1, data.assure?.cin, 382, 635, 14)
  drawText(page1, data.assure?.adresse, 335, 600, 8, false)
  drawText(page1, `${data.assure?.montantTotal || '150.00'} DH`, 365, 580, 9)
  drawText(page1, data.assure?.nombrePieces || '1', 345, 560, 9)

  // Bénéficiaire de soins
  drawText(page1, data.beneficiaire?.nomPrenom, 350, 498, 9)
  drawBoxes(page1, data.beneficiaire?.dateNaissance, 360, 473, 14)
  drawBoxes(page1, data.beneficiaire?.cin, 385, 453, 14.5)

  // Cocher Sexe (M / F)
  if (data.beneficiaire?.sexe === 'M') {
    drawText(page1, 'X', 442, 438, 10)
  } else {
    drawText(page1, 'X', 482, 438, 10)
  }

  // Cocher Type de soins (Maladie)
  drawText(page1, 'X', 512, 365, 10)

  // INPE & Doctor details
  drawBoxes(page1, data.consultation?.inpe, 340, 413, 13)
  drawText(page1, data.consultation?.ville, 425, 325, 8, false)
  drawText(page1, data.consultation?.date, 345, 325, 8, false)

  // Embed FSE QR Code in Top Right Corner
  try {
    const qrPayload = JSON.stringify({
      fse_ver: "1.0",
      inpe: data.consultation?.inpe,
      patient_cin: data.beneficiaire?.cin,
      immat: data.assure?.immatriculation,
      date: data.consultation?.date,
      total: data.assure?.montantTotal,
    })
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 120 })
    const qrImage = await pdfDoc.embedPng(qrDataUrl)
    page1.drawImage(qrImage, {
      x: 485,
      y: 730,
      width: 65,
      height: 65
    })
  } catch (e) {
    console.warn('QR Code generation skipped:', e)
  }

  // ==========================================
  // PAGE 2: DESCRIPTION DES ACTES EFFECTUÉS
  // ==========================================
  if (page2 && data.actes && data.actes.length > 0) {
    let actY = 700
    data.actes.forEach((acte) => {
      drawText(page2, acte.date, 35, actY, 8, false)
      drawText(page2, acte.code, 120, actY, 8, true)
      drawText(page2, acte.cotation, 180, actY, 8, true)
      drawText(page2, `${acte.montant} DH`, 245, actY, 8, true)
      drawText(page2, `INPE: ${acte.inpe}`, 340, actY, 7, false)
      actY -= 35
    })
  }

  return await pdfDoc.save()
}
