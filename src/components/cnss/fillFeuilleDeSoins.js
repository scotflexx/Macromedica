import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'

const DEBUG_MODE = true

// The Master Bounding Box Map
const CNSS_MAP = {
  assureNom: { x: 345, y: 685, w: 150, h: 12, size: 9, type: 'text' },
  assureImmat: { x: 368, y: 668, w: 160, h: 12, size: 9, type: 'boxes', spacing: 12.8 },
  assureCin: { x: 378, y: 648, w: 110, h: 12, size: 9, type: 'boxes', spacing: 13.0 },
  assureAdresse: { x: 335, y: 605, w: 200, h: 12, size: 8, type: 'text' },
  assureMontant: { x: 365, y: 585, w: 100, h: 12, size: 9, type: 'text' },
  assurePieces: { x: 345, y: 565, w: 50, h: 12, size: 9, type: 'text' },

  benefNom: { x: 345, y: 522, w: 150, h: 12, size: 9, type: 'text' },
  benefDate: { x: 346, y: 502, w: 120, h: 12, size: 9, type: 'boxes', spacing: 13.0 },
  benefCin: { x: 378, y: 482, w: 110, h: 12, size: 9, type: 'boxes', spacing: 13.0 },

  praticienInpe: { x: 368, y: 442, w: 160, h: 12, size: 9, type: 'boxes', spacing: 12.8 },
  consultVille: { x: 435, y: 340, w: 100, h: 12, size: 8, type: 'text' },
  consultDate: { x: 355, y: 340, w: 80, h: 12, size: 8, type: 'text' },
}

export async function fillFeuilleDeSoins(data) {
  const pdfDoc = await PDFDocument.create()
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const textColor = rgb(0.1, 0.1, 0.2)
  const debugColor = rgb(1, 0, 0) // Red for bounding boxes

  // Load backgrounds
  const page1ImageBytes = await fetch('/assets/cnss-page1.jpg').then(res => res.arrayBuffer())
  let page2ImageBytes = null
  try {
    page2ImageBytes = await fetch('/assets/cnss-page2.jpg').then(res => res.arrayBuffer())
  } catch (e) {
    console.warn('Page 2 background skipped:', e)
  }

  const bg1 = await pdfDoc.embedJpg(page1ImageBytes)
  const page1 = pdfDoc.addPage([595.28, 841.89])
  page1.drawImage(bg1, { x: 0, y: 0, width: 595.28, height: 841.89 })

  let page2 = null
  if (page2ImageBytes) {
    const bg2 = await pdfDoc.embedJpg(page2ImageBytes)
    page2 = pdfDoc.addPage([595.28, 841.89])
    page2.drawImage(bg2, { x: 0, y: 0, width: 595.28, height: 841.89 })
  }

  // Engine: Renders data based on the Master Map
  const renderField = (fieldKey, value, targetPage = page1) => {
    if (!value) return
    const box = CNSS_MAP[fieldKey]
    if (!box) return

    // Draw Debug Box if DEBUG_MODE is active
    if (DEBUG_MODE) {
      targetPage.drawRectangle({
        x: box.x,
        y: box.y,
        width: box.w,
        height: box.h,
        borderColor: debugColor,
        borderWidth: 0.5
      })
    }

    if (box.type === 'text') {
      let currentSize = box.size
      let textWidth = fontBold.widthOfTextAtSize(String(value), currentSize)
      while (textWidth > box.w && currentSize > 4) {
        currentSize -= 0.5
        textWidth = fontBold.widthOfTextAtSize(String(value), currentSize)
      }
      targetPage.drawText(String(value), {
        x: box.x,
        y: box.y + 2,
        size: currentSize,
        font: fontBold,
        color: textColor
      })
    } else if (box.type === 'boxes') {
      const clean = String(value).replace(/[^a-zA-Z0-9]/g, '')
      for (let i = 0; i < clean.length; i++) {
        targetPage.drawText(clean[i], {
          x: box.x + (i * (box.spacing || 13.0)),
          y: box.y + 2,
          size: box.size,
          font: fontBold,
          color: textColor
        })
      }
    }
  }

  // Execute Master Map Rendering
  renderField('assureNom', data.assure?.nomPrenom)
  renderField('assureImmat', data.assure?.immatriculation)
  renderField('assureCin', data.assure?.cin)
  renderField('assureAdresse', data.assure?.adresse)
  renderField('assureMontant', `${data.assure?.montantTotal || '150.00'} DH`)
  renderField('assurePieces', data.assure?.nombrePieces || '1')

  renderField('benefNom', data.beneficiaire?.nomPrenom)
  const cleanDate = (data.beneficiaire?.dateNaissance || '').replace(/[^0-9]/g, '')
  renderField('benefDate', cleanDate)
  renderField('benefCin', data.beneficiaire?.cin)
  renderField('praticienInpe', data.consultation?.inpe)
  renderField('consultVille', data.consultation?.ville)
  renderField('consultDate', data.consultation?.date)

  // Checkboxes (Sexe)
  if (data.beneficiaire?.sexe === 'M') {
    page1.drawText('X', { x: 496, y: 468, size: 9, font: fontBold, color: textColor })
  } else {
    page1.drawText('X', { x: 440, y: 468, size: 9, font: fontBold, color: textColor })
  }

  // Checkbox (Type de soins -> Maladie)
  page1.drawText('X', { x: 512, y: 368, size: 9, font: fontBold, color: textColor })

  // Embed FSE QR Code
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

  // Page 2: Actes Médicaux
  if (page2 && data.actes && data.actes.length > 0) {
    let actY = 658
    data.actes.forEach((acte) => {
      page2.drawText(String(acte.date), { x: 52, y: actY, size: 8, font: fontRegular, color: textColor })
      page2.drawText(String(acte.code), { x: 128, y: actY, size: 8, font: fontBold, color: textColor })
      page2.drawText(String(acte.cotation), { x: 188, y: actY, size: 8, font: fontBold, color: textColor })
      page2.drawText(`${acte.montant} DH`, { x: 252, y: actY, size: 8, font: fontBold, color: textColor })
      page2.drawText(`INPE: ${acte.inpe}`, { x: 355, y: actY, size: 7.5, font: fontRegular, color: textColor })
      actY -= 20
    })
  }

  return await pdfDoc.save()
}
