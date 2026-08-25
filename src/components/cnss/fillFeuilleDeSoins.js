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
  // PAGE 1: ASSURÉ (Top Section)
  // ==========================================
  drawText(page1, data.assure?.nomPrenom, 345, 692, 9);
  drawBoxes(page1, data.assure?.immatriculation, 368, 672, 12.8, 8.5);
  drawBoxes(page1, data.assure?.cin, 378, 652, 13.0, 8.5);
  drawText(page1, data.assure?.adresse, 335, 612, 8);
  drawText(page1, `${data.assure?.montantTotal || '150.00'} DH`, 365, 590, 8.5);
  drawText(page1, data.assure?.nombrePieces || '1', 345, 570, 8.5);

  // --- PAGE 1: BÉNÉFICIAIRE (Middle Section) ---
  drawText(page1, data.beneficiaire?.nomPrenom, 345, 528, 9);
  // Clean date to 8 digits without slashes (e.g. "14051998")
  const cleanDate = (data.beneficiaire?.dateNaissance || '').replace(/[^0-9]/g, '');
  drawBoxes(page1, cleanDate, 346, 508, 13.0, 8.5);
  drawBoxes(page1, data.beneficiaire?.cin, 378, 488, 13.0, 8.5);

  // Checkboxes (Sexe)
  if (data.beneficiaire?.sexe === 'M') {
    drawText(page1, 'X', 496, 468, 9);
  } else {
    drawText(page1, 'X', 440, 468, 9);
  }

  // Checkbox (Type de soins -> Maladie)
  drawText(page1, 'X', 512, 368, 9);

  // Praticien & INPE
  drawBoxes(page1, data.consultation?.inpe, 368, 448, 12.8, 8.5);
  drawText(page1, data.consultation?.ville, 435, 340, 8);
  drawText(page1, data.consultation?.date, 355, 340, 8);

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
  // PAGE 2: ACTES MÉDICAUX (Table)
  // ==========================================
  if (page2 && data.actes && data.actes.length > 0) {
    let actY = 658;
    data.actes.forEach((acte) => {
      drawText(page2, acte.date, 52, actY, 8);
      drawText(page2, acte.code, 128, actY, 8);
      drawText(page2, acte.cotation, 188, actY, 8);
      drawText(page2, `${acte.montant} DH`, 252, actY, 8);
      drawText(page2, `INPE: ${acte.inpe}`, 355, actY, 7.5);
      actY -= 20;
    });
  }

  return await pdfDoc.save()
}
