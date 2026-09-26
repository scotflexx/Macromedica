import { StandardFonts, rgb } from 'pdf-lib';

/**
 * appendFSEAnnexPage — Adds an official CNSS Annex Sheet to an existing PDFDocument
 *
 * @param {PDFDocument} pdfDoc - The target pdf-lib PDFDocument instance
 * @param {Object} patient - Patient data object
 * @param {Object} doctor - Doctor / Clinic profile data object
 * @param {Object} consultation - Consultation details with itemized acts array
 */
export async function appendFSEAnnexPage(pdfDoc, patient = {}, doctor = {}, consultation = {}) {
  const A4_WIDTH = 841.89;
  const A4_HEIGHT = 595.28;

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const INK_BLUE = rgb(0.1, 0.3, 0.7);
  const TEXT_DARK = rgb(0.15, 0.15, 0.2);
  const BORDER_GRAY = rgb(0.8, 0.82, 0.86);
  const BG_LIGHT = rgb(0.96, 0.97, 0.99);

  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const { width, height } = page.getSize();

  // --- Header Title Bar ---
  page.drawRectangle({
    x: 35,
    y: height - 60,
    width: width - 70,
    height: 38,
    color: INK_BLUE,
  });

  page.drawText("FEUILLE D'ANNEXE — BORDEREAU DÉTAILLÉ DES ACTES & PRESTATIONS", {
    x: 50,
    y: height - 38,
    size: 13,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("Document annexe à joindre à la Feuille de Soins CNSS", {
    x: 50,
    y: height - 52,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.9, 0.95, 1),
  });

  // --- Patient & Doctor Info Grid ---
  const infoY = height - 125;
  const cardWidth = (width - 80) / 2;

  // Patient Card (Left)
  page.drawRectangle({
    x: 35,
    y: infoY,
    width: cardWidth,
    height: 55,
    borderColor: BORDER_GRAY,
    borderWidth: 1,
    color: BG_LIGHT,
  });

  page.drawText("INFORMATIONS DU BÉNÉFICIAIRE", {
    x: 45,
    y: infoY + 41,
    size: 8,
    font: fontBold,
    color: INK_BLUE,
  });

  const patientName = `${patient.first_name || patient.prenom || ''} ${patient.last_name || patient.nom || ''}`.trim() || patient.nomComplet || '—';
  page.drawText(`Patient : ${patientName}`, { x: 45, y: infoY + 26, size: 9, font: fontBold, color: TEXT_DARK });
  page.drawText(`CIN : ${patient.cin || '—'}   |   Immatriculation CNSS : ${patient.immatriculation || patient.cnss_number || '—'}`, {
    x: 45,
    y: infoY + 12,
    size: 8.5,
    font: fontRegular,
    color: TEXT_DARK,
  });

  // Doctor Card (Right)
  page.drawRectangle({
    x: 35 + cardWidth + 10,
    y: infoY,
    width: cardWidth,
    height: 55,
    borderColor: BORDER_GRAY,
    borderWidth: 1,
    color: BG_LIGHT,
  });

  page.drawText("MÉDECIN TRAITANT & ÉTABLISSEMENT", {
    x: 45 + cardWidth + 10,
    y: infoY + 41,
    size: 8,
    font: fontBold,
    color: INK_BLUE,
  });

  const docName = doctor.name || doctor.doctor_name || 'Dr. Médecin Traitant';
  page.drawText(`Praticien : ${docName}`, { x: 45 + cardWidth + 10, y: infoY + 26, size: 9, font: fontBold, color: TEXT_DARK });
  page.drawText(`INPE : ${doctor.inpe_code || doctor.inpe || '—'}   |   Établissement : ${doctor.etablissement || doctor.clinic_name || 'Cabinet Médical'}`, {
    x: 45 + cardWidth + 10,
    y: infoY + 12,
    size: 8.5,
    font: fontRegular,
    color: TEXT_DARK,
  });

  // --- Table Header ---
  const tableY = infoY - 20;
  const cols = [
    { name: 'N°', width: 35, x: 35 },
    { name: 'Date', width: 80, x: 70 },
    { name: 'Code / Cotation', width: 110, x: 150 },
    { name: 'Désignation de l\'Acte / Prestation', width: 360, x: 260 },
    { name: 'Qte / Coeff', width: 75, x: 620 },
    { name: 'Montant (MAD)', width: 111, x: 695 },
  ];

  page.drawRectangle({
    x: 35,
    y: tableY - 18,
    width: width - 70,
    height: 20,
    color: rgb(0.92, 0.94, 0.98),
    borderColor: BORDER_GRAY,
    borderWidth: 1,
  });

  cols.forEach((col) => {
    page.drawText(col.name, {
      x: col.x + 5,
      y: tableY - 12,
      size: 8.5,
      font: fontBold,
      color: INK_BLUE,
    });
  });

  // Items List Processing
  const rawItems = consultation.acts || consultation.items || consultation.acts_list || [];
  const items = rawItems.length > 0 ? rawItems : [
    { date: consultation.date || new Date().toLocaleDateString('fr-FR'), code: 'C', label: 'Consultation de médecine générale', qte: 1, montant: consultation.price || consultation.montantTotal || 150 },
    { date: consultation.date || new Date().toLocaleDateString('fr-FR'), code: 'K', label: 'Acte médical complémentaire & suivi', qte: 1, montant: 100 }
  ];

  let currentY = tableY - 38;
  const rowHeight = 22;
  let totalAmount = 0;

  items.forEach((item, index) => {
    const itemAmount = Number(item.montant || item.price || 0);
    totalAmount += itemAmount;

    // Row Background
    if (index % 2 === 1) {
      page.drawRectangle({
        x: 35,
        y: currentY - 2,
        width: width - 70,
        height: rowHeight,
        color: rgb(0.98, 0.98, 1.0),
      });
    }

    // Border line under row
    page.drawLine({
      start: { x: 35, y: currentY - 2 },
      end: { x: width - 35, y: currentY - 2 },
      thickness: 0.5,
      color: BORDER_GRAY,
    });

    const itemDate = item.date || consultation.date || new Date().toLocaleDateString('fr-FR');
    const itemCode = item.code || item.cotation || `ACTE-${index + 1}`;
    const itemLabel = item.label || item.designation || item.description || `Acte n° ${index + 1}`;
    const itemQte = String(item.qte || item.coefficient || 1);

    page.drawText(String(index + 1), { x: cols[0].x + 5, y: currentY + 4, size: 8.5, font: fontRegular, color: TEXT_DARK });
    page.drawText(itemDate, { x: cols[1].x + 5, y: currentY + 4, size: 8.5, font: fontRegular, color: TEXT_DARK });
    page.drawText(itemCode, { x: cols[2].x + 5, y: currentY + 4, size: 8.5, font: fontBold, color: INK_BLUE });
    page.drawText(itemLabel.length > 55 ? itemLabel.substring(0, 52) + '...' : itemLabel, { x: cols[3].x + 5, y: currentY + 4, size: 8.5, font: fontRegular, color: TEXT_DARK });
    page.drawText(itemQte, { x: cols[4].x + 5, y: currentY + 4, size: 8.5, font: fontRegular, color: TEXT_DARK });
    page.drawText(`${itemAmount.toFixed(2)} MAD`, { x: cols[5].x + 5, y: currentY + 4, size: 8.5, font: fontBold, color: TEXT_DARK });

    currentY -= rowHeight;
  });

  // Table Outer Border
  page.drawRectangle({
    x: 35,
    y: currentY + rowHeight - 2,
    width: width - 70,
    height: tableY - 18 - (currentY + rowHeight - 2),
    borderColor: BORDER_GRAY,
    borderWidth: 1,
  });

  // --- Total Summary Box ---
  const summaryY = currentY - 30;
  page.drawRectangle({
    x: width - 280,
    y: summaryY,
    width: 245,
    height: 38,
    color: rgb(0.92, 0.95, 1.0),
    borderColor: INK_BLUE,
    borderWidth: 1,
  });

  page.drawText("TOTAL ANNEXE DES FRAIS :", {
    x: width - 270,
    y: summaryY + 14,
    size: 9.5,
    font: fontBold,
    color: INK_BLUE,
  });

  const displayTotal = consultation.montantTotal || consultation.price || totalAmount;
  page.drawText(`${Number(displayTotal).toFixed(2)} MAD`, {
    x: width - 130,
    y: summaryY + 12,
    size: 13,
    font: fontBold,
    color: INK_BLUE,
  });

  // --- Doctor Signature & Stamp Box ---
  const stampY = 40;
  page.drawRectangle({
    x: width - 280,
    y: stampY,
    width: 245,
    height: 65,
    borderColor: BORDER_GRAY,
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });

  page.drawText("Cachet et Signature du Médecin Traitant", {
    x: width - 265,
    y: stampY + 48,
    size: 8,
    font: fontBold,
    color: TEXT_DARK,
  });

  page.drawText(`Fait à ${doctor.city || 'Casablanca'}, le ${consultation.date || new Date().toLocaleDateString('fr-FR')}`, {
    x: 45,
    y: stampY + 48,
    size: 8.5,
    font: fontRegular,
    color: TEXT_DARK,
  });

  page.drawText(`Nombre total de pièces jointes : ${consultation.pieces_jointes || consultation.piecesJointes || 1}`, {
    x: 45,
    y: stampY + 32,
    size: 8.5,
    font: fontBold,
    color: INK_BLUE,
  });

  return pdfDoc;
}

