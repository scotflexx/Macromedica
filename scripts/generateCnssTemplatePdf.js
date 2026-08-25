import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

async function createCnssTemplatePdf() {
  const pdfDoc = await PDFDocument.create()
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // Standard A4 dimensions: 595.28 x 841.89 pt
  const page1 = pdfDoc.addPage([595.28, 841.89])
  const page2 = pdfDoc.addPage([595.28, 841.89])

  const primaryColor = rgb(0.05, 0.25, 0.55)
  const textColor = rgb(0.15, 0.15, 0.15)
  const lineStroke = rgb(0.5, 0.5, 0.5)
  const lightGrayBg = rgb(0.96, 0.97, 0.98)

  // =========================================================================
  // PAGE 1: OFFICIAL MOROCCAN CNSS GRAPHICS, BORDERS, BOXES & TITLES
  // =========================================================================
  page1.drawRectangle({ x: 15, y: 15, width: 565.28, height: 811.89, borderColor: lineStroke, borderWidth: 1 })

  // Top Left CNSS Logo Box
  page1.drawRectangle({ x: 25, y: 770, width: 140, height: 45, color: lightGrayBg, borderColor: lineStroke, borderWidth: 0.8 })
  page1.drawText("CNSS MAROC", { x: 35, y: 800, size: 10, font: fontBold, color: primaryColor })
  page1.drawText("Caisse Nationale de", { x: 35, y: 788, size: 7.5, font: fontRegular, color: textColor })
  page1.drawText("Sécurité Sociale", { x: 35, y: 778, size: 7.5, font: fontRegular, color: textColor })

  // Top Right Header & Reference Box
  page1.drawRectangle({ x: 410, y: 770, width: 160, height: 45, color: lightGrayBg, borderColor: lineStroke, borderWidth: 0.8 })
  page1.drawText("Direction de l'Assurance Maladie", { x: 415, y: 802, size: 7, font: fontRegular, color: textColor })
  page1.drawText("Obligatoire (AMO)", { x: 415, y: 792, size: 7, font: fontRegular, color: textColor })
  page1.drawText("Ref 610-1-02 - Ref. 610", { x: 415, y: 778, size: 8, font: fontBold, color: primaryColor })

  // Center Main Title Box
  page1.drawRectangle({ x: 175, y: 770, width: 225, height: 45, color: lightGrayBg, borderColor: lineStroke, borderWidth: 1 })
  page1.drawText("FEUILLE DE SOINS MALADIE", { x: 195, y: 798, size: 11, font: fontBold, color: primaryColor })
  page1.drawText("Royaume du Maroc - CNSS", { x: 225, y: 780, size: 8, font: fontBold, color: textColor })

  // Approval Checkboxes
  page1.drawRectangle({ x: 175, y: 750, width: 225, height: 18, borderColor: lineStroke, borderWidth: 0.8 })
  page1.drawText("Entente préalable * [   ]     Exécution * [   ]", { x: 190, y: 755, size: 8, font: fontBold })

  // Section 1: Partie réservée à l'assuré(e)
  page1.drawRectangle({ x: 25, y: 550, width: 545, height: 190, borderColor: lineStroke, borderWidth: 0.8 })
  page1.drawRectangle({ x: 25, y: 720, width: 545, height: 20, color: lightGrayBg })
  page1.drawText("PARTIE RESERVEE A L'ASSURE(E)", { x: 35, y: 726, size: 9, font: fontBold, color: primaryColor })

  page1.drawText("Nom et prénom / Nom et Prénom :", { x: 35, y: 685, size: 8, font: fontRegular })
  page1.drawText("N° Immatriculation / N. Immatriculation :", { x: 35, y: 663, size: 8, font: fontRegular })
  page1.drawText("N° CIN / N. CIN :", { x: 35, y: 642, size: 8, font: fontRegular })
  page1.drawText("Adresse / Adresse :", { x: 35, y: 600, size: 8, font: fontRegular })
  page1.drawText("Montant des frais / Montant des Frais :", { x: 35, y: 580, size: 8, font: fontRegular })
  page1.drawText("Dhs", { x: 420, y: 580, size: 8, font: fontBold })
  page1.drawText("Nombre de pièces jointes / Nombre de Pièces Jointes :", { x: 35, y: 562, size: 8, font: fontRegular })

  // Draw Boxed Digit Grids for Immatriculation & CIN
  for (let i = 0; i < 9; i++) {
    page1.drawRectangle({ x: 375 + i * 14.2, y: 658, width: 13, height: 14, borderColor: lineStroke, borderWidth: 0.6 })
  }
  for (let i = 0; i < 8; i++) {
    page1.drawRectangle({ x: 385 + i * 14.5, y: 637, width: 13, height: 14, borderColor: lineStroke, borderWidth: 0.6 })
  }

  // Section 2: Déclaration du médecin traitant & Bénéficiaire
  page1.drawRectangle({ x: 25, y: 310, width: 545, height: 230, borderColor: lineStroke, borderWidth: 0.8 })
  page1.drawRectangle({ x: 25, y: 520, width: 545, height: 20, color: lightGrayBg })
  page1.drawText("DECLARATION DU MEDECIN TRAITANT", { x: 35, y: 526, size: 9, font: fontBold, color: primaryColor })

  page1.drawText("Nom et prénom / Bénéficiaire de Soins :", { x: 35, y: 498, size: 8, font: fontRegular })
  page1.drawText("Date de naissance / Date de Naissance :", { x: 35, y: 478, size: 8, font: fontRegular })
  page1.drawText("N° CIN / N. CIN Bénéficiaire :", { x: 35, y: 458, size: 8, font: fontRegular })
  page1.drawText("Sexe / Sexe :", { x: 35, y: 438, size: 8, font: fontRegular })
  page1.drawText("M [   ]       F [   ]", { x: 430, y: 438, size: 8, font: fontBold })

  for (let i = 0; i < 8; i++) {
    page1.drawRectangle({ x: 360 + i * 14, y: 473, width: 13, height: 14, borderColor: lineStroke, borderWidth: 0.6 })
  }
  for (let i = 0; i < 8; i++) {
    page1.drawRectangle({ x: 385 + i * 14.5, y: 453, width: 13, height: 14, borderColor: lineStroke, borderWidth: 0.6 })
  }

  page1.drawText("INPE et code à barres / INPE Médecin Traitant :", { x: 35, y: 418, size: 8, font: fontRegular })
  for (let i = 0; i < 15; i++) {
    page1.drawRectangle({ x: 340 + i * 13, y: 413, width: 12, height: 14, borderColor: lineStroke, borderWidth: 0.6 })
  }

  // Type de soins section
  page1.drawRectangle({ x: 25, y: 345, width: 545, height: 35, color: lightGrayBg, borderColor: lineStroke, borderWidth: 0.6 })
  page1.drawText("Type de soins * :", { x: 35, y: 365, size: 8, font: fontBold })
  page1.drawText("Hospitalisation [   ]    Maternité [   ]    Accident [   ]    Maladie [   ]", { x: 200, y: 365, size: 8, font: fontRegular })

  page1.drawText("Fait à :", { x: 400, y: 325, size: 8, font: fontRegular })
  page1.drawText("Le :", { x: 330, y: 325, size: 8, font: fontRegular })

  // Bottom Stamps Box
  page1.drawRectangle({ x: 25, y: 30, width: 260, height: 100, borderColor: lineStroke, borderWidth: 0.8 })
  page1.drawText("Signature de l'assuré(e)", { x: 35, y: 115, size: 8, font: fontBold })

  page1.drawRectangle({ x: 310, y: 30, width: 260, height: 100, borderColor: lineStroke, borderWidth: 0.8 })
  page1.drawText("Cachet et Signature du Médecin traitant", { x: 320, y: 115, size: 8, font: fontBold })
  page1.drawText("ou de l'Etablissement de soins", { x: 320, y: 102, size: 8, font: fontRegular })

  // =========================================================================
  // PAGE 2: TABLE DESCRIPTION DES ACTES EFFECTUES (NGAP)
  // =========================================================================
  page2.drawRectangle({ x: 15, y: 15, width: 565.28, height: 811.89, borderColor: lineStroke, borderWidth: 1 })

  // Page 2 Header Box
  page2.drawRectangle({ x: 25, y: 775, width: 545, height: 40, color: lightGrayBg, borderColor: lineStroke, borderWidth: 0.8 })
  page2.drawText("DESCRIPTION DES ACTES EFFECTUES (NGAP / CIM-10)", { x: 130, y: 790, size: 11, font: fontBold, color: primaryColor })

  // Table Headers
  page2.drawRectangle({ x: 25, y: 735, width: 545, height: 35, color: lightGrayBg, borderColor: lineStroke, borderWidth: 0.8 })
  page2.drawLine({ start: { x: 110, y: 735 }, end: { x: 110, y: 770 }, color: lineStroke, thickness: 0.8 })
  page2.drawLine({ start: { x: 170, y: 735 }, end: { x: 170, y: 770 }, color: lineStroke, thickness: 0.8 })
  page2.drawLine({ start: { x: 235, y: 735 }, end: { x: 235, y: 770 }, color: lineStroke, thickness: 0.8 })
  page2.drawLine({ start: { x: 330, y: 735 }, end: { x: 330, y: 770 }, color: lineStroke, thickness: 0.8 })

  page2.drawText("Date des actes", { x: 35, y: 752, size: 8, font: fontBold })
  page2.drawText("Code actes", { x: 115, y: 752, size: 8, font: fontBold })
  page2.drawText("Lettre clé +\ncotation NGAP", { x: 175, y: 752, size: 7.5, font: fontBold })
  page2.drawText("Montant facturé", { x: 242, y: 752, size: 8, font: fontBold })
  page2.drawText("Signature et cachet du Médecin traitant", { x: 340, y: 752, size: 8, font: fontBold })

  // Grid rows for Page 2
  for (let r = 0; r < 8; r++) {
    const yRow = 735 - (r + 1) * 35
    page2.drawRectangle({ x: 25, y: yRow, width: 545, height: 35, borderColor: lineStroke, borderWidth: 0.5 })
    page2.drawLine({ start: { x: 110, y: yRow }, end: { x: 110, y: yRow + 35 }, color: lineStroke, thickness: 0.5 })
    page2.drawLine({ start: { x: 170, y: yRow }, end: { x: 170, y: yRow + 35 }, color: lineStroke, thickness: 0.5 })
    page2.drawLine({ start: { x: 235, y: yRow }, end: { x: 235, y: yRow + 35 }, color: lineStroke, thickness: 0.5 })
    page2.drawLine({ start: { x: 330, y: yRow }, end: { x: 330, y: yRow + 35 }, color: lineStroke, thickness: 0.5 })
  }

  // Output directory check & file save
  const assetsDir = path.join(process.cwd(), 'public', 'assets')
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true })
  }

  const pdfBytes = await pdfDoc.save()
  const filePath = path.join(assetsDir, 'FEUILLE-DE-SOINS-MALADIE.pdf')
  fs.writeFileSync(filePath, pdfBytes)

  console.log(`✓ Template PDF successfully created at: ${filePath}`)
}

createCnssTemplatePdf().catch(console.error)
