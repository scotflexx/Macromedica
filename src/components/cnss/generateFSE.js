import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const scaleX = 841.89 / 1024;
const scaleY = 595.28 / 724;

/**
 * Convert pixel coordinates from the 1024x724 JPEG template to standard A4 Landscape PDF points (841.89 x 595.28).
 * Note: JPEG origin is top-left, PDF origin is bottom-left.
 */
function b(px, py, pw, ph) {
  return {
    x: +(px * scaleX).toFixed(2),
    y: +((724 - (py + ph)) * scaleY).toFixed(2),
    width: +(pw * scaleX).toFixed(2),
    height: +(ph * scaleY).toFixed(2),
  };
}

/**
 * Helper to build a boxed field structure that supports both:
 * 1. { label, boxes: [{x, y, width, height}, ...] }
 * 2. Array indexation: field[0], field.length (backward compatibility)
 */
function createBoxedField(label, boxList) {
  const arr = [...boxList];
  arr.label = label;
  arr.boxes = boxList;
  arr.x = boxList[0]?.x || 0;
  arr.y = boxList[0]?.y || 0;
  arr.width = +(boxList.reduce((acc, cur) => acc + cur.width, 0)).toFixed(2);
  arr.height = boxList[0]?.height || 0;
  return arr;
}

// Micro-calibrated bar coordinates from high-resolution template pixel analysis
const immatBars = [630, 643, 656, 669, 682, 695, 708, 721, 734, 748];
const cinAssureBars = [784, 797, 810, 823, 836, 849, 863, 876, 890];
const dnBars = [
  [755, 769], [769, 783],
  [796, 809], [809, 823],
  [835, 848], [848, 861], [861, 875], [875, 889],
];
const cinBenefBars = [627, 640, 654, 667, 680, 693, 706, 719, 733];
const inpeMedBars = [612, 626, 639, 652, 665, 678, 691, 704, 717, 730];
const inpeEtabBars = [871, 884, 898, 910, 923, 937, 950, 963, 976, 989];
const dbgBars = [
  [576, 588], [588, 600],
  [612, 623], [623, 636],
  [647, 659], [659, 671], [671, 683], [683, 695],
];
const dbdBars = [
  [828, 840], [840, 852],
  [864, 876], [876, 888],
  [900, 912], [912, 924], [924, 935], [935, 947],
];

/**
 * MASTER EXACT COORDINATE CONFIGURATION FOR CNSS FEUILLE DE SOINS (A4 LANDSCAPE)
 * Template: FSE_CNSS_page1.jpg (1024 x 724 px scaled to 841.89 x 595.28 pt)
 * Individual bounding boxes calibrated per character and per field.
 */
export const CNSS_EXACT_MAP = {
  // --- Section 1: En-tête ---
  num_dossier: { ...b(585, 114, 115, 10), label: 'N° Dossier' },
  check_entente_prealable: { ...b(695, 77, 16, 14), label: 'Entente préalable' },
  check_execution: { ...b(825, 77, 16, 13), label: 'Exécution' },

  // --- Section 2: Partie réservée à l'assuré(e) ---
  assure_nom: { ...b(615, 144, 295, 8), label: 'Nom et prénom (Assuré)' },
  immatriculation: createBoxedField(
    'N° Immatriculation',
    immatBars.slice(0, 9).map((x, i) => b(x, 152.5, immatBars[i + 1] - x, 9.5))
  ),
  cin_assure: createBoxedField(
    'N° CIN Assuré',
    cinAssureBars.slice(0, 8).map((x, i) => b(x, 164, cinAssureBars[i + 1] - x, 9.5))
  ),
  check_conjoint: { ...b(687, 196, 15, 13), label: 'Conjoint' },
  check_enfant: { ...b(895, 196, 15, 13), label: 'Enfant' },
  adresse: { ...b(570, 214, 394, 25), label: 'Adresse' },
  montant_frais: { ...b(691, 245, 154, 22), label: 'Montant' },
  nombre_pieces: { ...b(739, 270, 56, 20), label: 'Pièces' },

  // --- Section 3: Bénéficiaire de soins ---
  beneficiaire_nom: { ...b(610, 344, 295, 8), label: 'Nom (Bénéficiaire)' },
  date_naissance: createBoxedField(
    'Date de Naissance',
    dnBars.map((pair) => b(pair[0], 354, pair[1] - pair[0], 9.5))
  ),
  cin_beneficiaire: createBoxedField(
    'N° CIN Bénéficiaire',
    cinBenefBars.slice(0, 8).map((x, i) => b(x, 364, cinBenefBars[i + 1] - x, 9.5))
  ),
  check_sexe_m: { ...b(685, 386, 15, 13), label: 'Sexe M' },
  check_sexe_f: { ...b(789, 386, 15, 13), label: 'Sexe F' },

  // --- Section 4: INPE & Professionnels / Établissements ---
  inpe: createBoxedField(
    'INPE Médecin Traitant',
    inpeMedBars.slice(0, 9).map((x, i) => b(x, 424, inpeMedBars[i + 1] - x, 9.5))
  ),
  inpe_etablissement: createBoxedField(
    'INPE Établissement',
    inpeEtabBars.slice(0, 9).map((x, i) => b(x, 424, inpeEtabBars[i + 1] - x, 9.5))
  ),
  medecin_traitant_nom: { ...b(528, 462, 235, 22), label: 'Médecin Traitant' },
  etablissement_soins_nom: { ...b(778, 462, 228, 22), label: 'Établissement de soins' },

  // --- Section 5: Type de soins ---
  check_maladie: { ...b(625, 501, 15, 15), label: 'Maladie' },
  check_maternite: { ...b(926, 495, 15, 15), label: 'Maternité' },
  check_hospitalisation: { ...b(626, 525, 15, 15), label: 'Hospitalisation' },
  check_accident: { ...b(926, 529, 15, 15), label: 'Accident' },

  // --- Section 6: Signatures, Villes & Dates ---
  fait_a_assure: { ...b(552, 589, 128, 7.5), label: 'Fait à (Assuré)' },
  date_bas_gauche: createBoxedField(
    'Date (Assuré)',
    dbgBars.map((pair) => b(pair[0], 604, pair[1] - pair[0], 9.5))
  ),
  fait_a_medecin: { ...b(792, 589, 128, 7.5), label: 'Fait à (Médecin)' },
  date_bas_droite: createBoxedField(
    'Date (Médecin)',
    dbdBars.map((pair) => b(pair[0], 604, pair[1] - pair[0], 9.5))
  ),
};

/**
 * Normalise any date representation (DD/MM/YYYY, YYYY-MM-DD, ISO, etc.) into DDMMYYYY string
 */
export function cleanDateTo8Digits(dateStr) {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.split('T')[0].split('-');
    return `${d}${m}${y}`;
  }
  const clean = str.replace(/[^0-9]/g, '');
  if (clean.length >= 8) {
    return clean.substring(0, 8);
  }
  return '';
}

import {
  MOROCCAN_CIN_REGEX,
  sanitizeCIN,
  isValidCIN,
  sanitizeNumericOnly,
  isValidNumericCode,
  FSE_VALIDATION_SCHEMA,
  sanitizePatientData,
  sanitizeDoctorData,
  validateFseData,
} from '../../lib/fseSanitization.js';

export {
  MOROCCAN_CIN_REGEX,
  sanitizeCIN,
  isValidCIN,
  sanitizeNumericOnly,
  isValidNumericCode,
  FSE_VALIDATION_SCHEMA,
  sanitizePatientData,
  sanitizeDoctorData,
  validateFseData,
};

/**
 * writeText — PDF-Lib Dynamic Text Scaling with Overflow Protection
 *
 * Automatically measures string width using font.widthOfTextAtSize(text, size).
 * If the text width exceeds maxWidth (default 200 points, the approximate width
 * of the FSE name box), dynamically reduces the font size from default 10 down
 * to a minimum of 6 until it fits. If it still exceeds the box at size 6,
 * truncates the string and appends '...'.
 *
 * @param {PDFPage} page - pdf-lib PDFPage instance
 * @param {string} text - string content to render
 * @param {Object} options - { x, y, font, defaultSize = 10, minSize = 6, maxWidth = 200, color, align = 'left' }
 * @returns {{ text: string, size: number, width: number }}
 */
export function writeText(page, text, options = {}) {
  const {
    x = 0,
    y = 0,
    font,
    defaultSize = 10.0,
    minSize = 6.0,
    maxWidth = 200.0,
    color = rgb(0.1, 0.3, 0.7),
    align = 'left',
  } = options;

  let str = String(text || '').trim();
  if (!str) return { text: '', size: defaultSize, width: 0 };

  if (!font) {
    throw new Error('writeText requires a valid pdf-lib font instance.');
  }

  let currentSize = defaultSize;
  let textWidth = font.widthOfTextAtSize(str, currentSize);

  // Dynamically reduce font size from default 10 down to minimum 6 until it fits
  while (textWidth > maxWidth && currentSize > minSize) {
    currentSize -= 0.5;
    textWidth = font.widthOfTextAtSize(str, currentSize);
  }

  // If it still exceeds the box at size 6, truncate the string and append '...'
  let finalText = str;
  if (textWidth > maxWidth) {
    currentSize = minSize;
    const ellipsis = '...';
    while (finalText.length > 0 && font.widthOfTextAtSize(finalText + ellipsis, currentSize) > maxWidth) {
      finalText = finalText.slice(0, -1);
    }
    finalText = finalText ? finalText + ellipsis : ellipsis;
    textWidth = font.widthOfTextAtSize(finalText, currentSize);
  }

  const finalX = align === 'center' ? x + (maxWidth - textWidth) / 2 : x;

  if (page && typeof page.drawText === 'function') {
    page.drawText(finalText, {
      x: finalX,
      y,
      size: currentSize,
      font,
      color,
    });
  }

  return { text: finalText, size: currentSize, width: textWidth };
}

/**
 * Core PDF Generation Function with precision centering and optional DEBUG mode
 */
export const generateFSE = async (dbPatient = {}, dbDoctor = {}, dbConsultation = {}, options = {}) => {
  try {
    const debug = !!options.debug;

    // 1. Load the official background template
    let imageBytes = options.templateBytes;
    if (!imageBytes) {
      if (typeof window !== 'undefined') {
        const imageUrl = `/assets/FSE_CNSS_page1.jpg?t=${new Date().getTime()}`;
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Image template CNSS introuvable.');
        imageBytes = await response.arrayBuffer();
      } else {
        throw new Error('templateBytes must be provided in options in Node.js environment.');
      }
    }

    // 2. Lock to standard A4 Landscape canvas (841.89 x 595.28 pt)
    const A4_WIDTH = 841.89;
    const A4_HEIGHT = 595.28;

    const finalDoc = await PDFDocument.create();
    const fontRegular = await finalDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await finalDoc.embedFont(StandardFonts.HelveticaBold);
    const fontCourier = await finalDoc.embedFont(StandardFonts.CourierBold);
    const fontSmall = await finalDoc.embedFont(StandardFonts.Helvetica);

    // Color Toggle: Professional Dark Blue rgb(0.1, 0.3, 0.7) or Black rgb(0, 0, 0)
    const USE_DARK_BLUE = true;
    const INK_COLOR = options.color
      ? options.color
      : USE_DARK_BLUE
      ? rgb(0.1, 0.3, 0.7)
      : rgb(0, 0, 0);

    const DEBUG_RED = rgb(0.9, 0.1, 0.1);
    const DEBUG_BLUE = rgb(0.1, 0.35, 0.8);

    const page1 = finalDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    const templateImage = await finalDoc.embedJpg(imageBytes);

    page1.drawImage(templateImage, {
      x: 0,
      y: 0,
      width: A4_WIDTH,
      height: A4_HEIGHT,
    });

    // 3. Precision Box Centering Helper for Grid Numbers (CIN, Immatriculation, Date de Naissance, INPE)
    const drawCharInBox = (char, box, defaultSize = 12.0, boxIndex = 0, gridFont = fontCourier) => {
      let size = defaultSize;
      let charWidth = gridFont.widthOfTextAtSize(char, size);
      let capHeight = gridFont.heightAtSize(size, { descender: false }) || size * 0.7;

      // Ensure character fits neatly within individual box boundaries
      while ((charWidth > box.width - 0.4 || capHeight > box.height - 0.4) && size > 5.0) {
        size -= 0.5;
        charWidth = gridFont.widthOfTextAtSize(char, size);
        capHeight = gridFont.heightAtSize(size, { descender: false }) || size * 0.7;
      }

      // Mathematical center of individual box
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      const x = centerX - charWidth / 2;
      const y = centerY - capHeight / 2;

      page1.drawText(char, { x, y, size, font: gridFont, color: INK_COLOR });

      if (debug) {
        page1.drawRectangle({
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          borderColor: DEBUG_RED,
          borderWidth: 0.5,
        });
        const numStr = String(boxIndex + 1).padStart(2, '0');
        const numW = fontSmall.widthOfTextAtSize(numStr, 3.8);
        page1.drawText(numStr, {
          x: centerX - numW / 2,
          y: box.y + box.height + 0.8,
          size: 3.8,
          font: fontSmall,
          color: DEBUG_RED,
        });
      }
    };

    const drawArrayOfBoxes = (val, field, defaultSize = 12.0) => {
      const boxes = field.boxes || (Array.isArray(field) ? field : [field]);
      const clean = String(val || '').replace(/[^a-zA-Z0-9]/g, '');
      const count = Math.min(clean.length, boxes.length);

      if (debug && field.label) {
        const first = boxes[0];
        const info = `${field.label} (${first.x.toFixed(1)}, ${first.y.toFixed(1)})`;
        page1.drawText(info, {
          x: first.x,
          y: first.y + first.height + 5.0,
          size: 4.0,
          font: fontBold,
          color: DEBUG_BLUE,
        });
      }

      for (let i = 0; i < count; i++) {
        drawCharInBox(clean[i], boxes[i], defaultSize, i, fontCourier);
      }

      if (debug) {
        for (let i = count; i < boxes.length; i++) {
          const b = boxes[i];
          page1.drawRectangle({
            x: b.x,
            y: b.y,
            width: b.width,
            height: b.height,
            borderColor: DEBUG_RED,
            borderWidth: 0.4,
          });
          const numStr = String(i + 1).padStart(2, '0');
          const numW = fontSmall.widthOfTextAtSize(numStr, 3.8);
          page1.drawText(numStr, {
            x: b.x + b.width / 2 - numW / 2,
            y: b.y + b.height + 0.8,
            size: 3.8,
            font: fontSmall,
            color: DEBUG_RED,
          });
        }
      }
    };

    const drawTextInZone = (text, zone, defaultSize = 10.0, align = 'left', textFont = fontRegular) => {
      if (!zone) return;
      const str = String(text || '').trim();

      if (debug && zone.label) {
        const info = `${zone.label} [${zone.x.toFixed(1)}, ${zone.y.toFixed(1)}]`;
        page1.drawText(info, {
          x: zone.x,
          y: zone.y + zone.height + 1.5,
          size: 4.2,
          font: fontBold,
          color: DEBUG_BLUE,
        });
        page1.drawRectangle({
          x: zone.x,
          y: zone.y,
          width: zone.width,
          height: zone.height,
          borderColor: DEBUG_RED,
          borderWidth: 0.5,
        });
      }

      if (!str) return;

      // Limit to 200 points max (FSE name box) or zone width
      const targetMaxWidth = Math.min(zone.width || 200.0, 200.0);
      const capHeight = textFont.heightAtSize(defaultSize, { descender: false }) || defaultSize * 0.7;
      const centerY = zone.y + zone.height / 2;
      const targetY = centerY - capHeight / 2;
      const targetX = align === 'center' ? zone.x : zone.x + 3.0;

      return writeText(page1, str, {
        x: targetX,
        y: targetY,
        font: textFont,
        defaultSize: defaultSize || 10.0,
        minSize: 6.0,
        maxWidth: targetMaxWidth,
        color: INK_COLOR,
        align,
      });
    };

    const drawCheck = (box, defaultSize = 10.0) => {
      if (!box) return;
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      let markSize = defaultSize;
      let w = fontBold.widthOfTextAtSize('X', markSize);
      let capHeight = fontBold.heightAtSize(markSize, { descender: false }) || markSize * 0.7;

      while ((w > box.width - 2.0 || capHeight > box.height - 2.0) && markSize > 6.0) {
        markSize -= 0.5;
        w = fontBold.widthOfTextAtSize('X', markSize);
        capHeight = fontBold.heightAtSize(markSize, { descender: false }) || markSize * 0.7;
      }

      const x = centerX - w / 2;
      const y = centerY - capHeight / 2;

      page1.drawText('X', { x, y, size: markSize, font: fontBold, color: INK_COLOR });

      if (debug) {
        page1.drawRectangle({
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          borderColor: DEBUG_RED,
          borderWidth: 0.5,
        });
        if (box.label) {
          page1.drawText(box.label, {
            x: box.x,
            y: box.y + box.height + 1.5,
            size: 4.2,
            font: fontBold,
            color: DEBUG_BLUE,
          });
        }
      }
    };

    // 4. Strict Moroccan Regex Sanitization before PDF injection
    const sanitizedPatient = sanitizePatientData(dbPatient);
    const sanitizedDoctor = sanitizeDoctorData(dbDoctor);

    const validationResult = validateFseData(sanitizedPatient, sanitizedDoctor, dbConsultation);
    if (!validationResult.isValid) {
      console.warn('[generateFSE] Avertissements de validation des données FSE :', validationResult.errors);
    }

    const fullName = (
      sanitizedPatient.nomComplet ||
      sanitizedPatient.nomPrenom ||
      sanitizedPatient.name ||
      `${sanitizedPatient.first_name || sanitizedPatient.prenom || ''} ${sanitizedPatient.last_name || sanitizedPatient.nom || ''}`.trim()
    ).toUpperCase();

    // Immatriculation: Must be strictly numeric. Strip all spaces, dashes, or letters.
    const immat = sanitizeNumericOnly(sanitizedPatient.immatriculation || sanitizedPatient.cnss_number);

    // CIN: Must strictly match the Moroccan format: 1 or 2 uppercase letters followed by up to 6 digits (Regex: /^[A-Z]{1,2}\d{4,6}$/i). Strip all whitespace and special characters before testing.
    const rawCin = sanitizedPatient.cin || '';
    const cleanCin = sanitizeCIN(rawCin);
    const cin = isValidCIN(cleanCin) ? cleanCin : '';
    if (rawCin && !cin) {
      console.warn(`[generateFSE] CIN ignoré car non conforme au format marocain (/^[A-Z]{1,2}\\d{4,6}$/i) : "${rawCin}"`);
    }

    const address = sanitizedPatient.adresse || sanitizedPatient.address || '';
    const totalAmount =
      sanitizedPatient.montant != null
        ? String(sanitizedPatient.montant)
        : dbConsultation?.price != null
        ? String(dbConsultation.price)
        : dbConsultation?.montantTotal || '150.00';
    const piecesCount = String(
      dbConsultation?.pieces_jointes ||
        dbConsultation?.piecesJointes ||
        sanitizedPatient.pieces_jointes ||
        '1'
    );
    const birthDate8 = cleanDateTo8Digits(sanitizedPatient.dateNaissance || sanitizedPatient.date_of_birth);
    const gender = (sanitizedPatient.sexe || sanitizedPatient.gender || '').toUpperCase();

    // Doctor & Establishment Data
    // INPE: Must be strictly numeric. Strip all spaces, dashes, or letters.
    const inpe = sanitizeNumericOnly(sanitizedDoctor.inpe_code || sanitizedDoctor.inpe);
    const doctorName =
      sanitizedDoctor.name ||
      sanitizedDoctor.doctor_name ||
      sanitizedDoctor.nom ||
      (sanitizedDoctor.first_name ? `Dr. ${sanitizedDoctor.first_name} ${sanitizedDoctor.last_name || ''}` : '') ||
      '';
    const doctorSpecialty = sanitizedDoctor.specialty || sanitizedDoctor.specialite || '';
    const etablissementName =
      sanitizedDoctor.etablissement ||
      sanitizedDoctor.clinic_name ||
      sanitizedDoctor.nom_etablissement ||
      sanitizedDoctor.establishment ||
      '';
    const etablissementInpe = sanitizeNumericOnly(sanitizedDoctor.etablissement_inpe || sanitizedDoctor.inpe_etablissement);

    const city = sanitizedDoctor.city || sanitizedDoctor.ville || 'Casablanca';
    const rawConsultDate = dbConsultation?.date || new Date().toLocaleDateString('fr-FR');
    const consultDate8 = cleanDateTo8Digits(rawConsultDate);
    const dossierNum = dbConsultation?.dossier_numero || sanitizedPatient.dossier_numero || '';

    // 5. Fill fields with exact coordinate placements
    if (dossierNum) drawTextInZone(dossierNum, CNSS_EXACT_MAP.num_dossier, 8.5);

    // Section 1: Assuré (with dynamic scaling from 10 down to 6, truncating if > 200 pt)
    if (fullName) drawTextInZone(fullName, CNSS_EXACT_MAP.assure_nom, 10.0);
    if (immat) drawArrayOfBoxes(immat, CNSS_EXACT_MAP.immatriculation, 8.5);
    if (cin) drawArrayOfBoxes(cin, CNSS_EXACT_MAP.cin_assure, 8.5);

    if (sanitizedPatient?.relation === 'conjoint' || sanitizedPatient?.isConjoint) {
      drawCheck(CNSS_EXACT_MAP.check_conjoint);
    } else if (sanitizedPatient?.relation === 'enfant' || sanitizedPatient?.isEnfant) {
      drawCheck(CNSS_EXACT_MAP.check_enfant);
    }

    if (address) drawTextInZone(address, CNSS_EXACT_MAP.adresse, 9.0);
    if (totalAmount) drawTextInZone(totalAmount, CNSS_EXACT_MAP.montant_frais, 9.5, 'center');
    if (piecesCount) drawTextInZone(piecesCount, CNSS_EXACT_MAP.nombre_pieces, 9.0, 'center');

    // Section 2: Bénéficiaire (with dynamic scaling from 10 down to 6, truncating if > 200 pt)
    if (fullName) drawTextInZone(fullName, CNSS_EXACT_MAP.beneficiaire_nom, 10.0);
    if (birthDate8) drawArrayOfBoxes(birthDate8, CNSS_EXACT_MAP.date_naissance, 8.5);
    if (cin) drawArrayOfBoxes(cin, CNSS_EXACT_MAP.cin_beneficiaire, 8.5);

    if (gender === 'M' || gender === 'MALE' || gender === 'HOMME') {
      drawCheck(CNSS_EXACT_MAP.check_sexe_m, 9.5);
    } else if (gender === 'F' || gender === 'FEMALE' || gender === 'FEMME') {
      drawCheck(CNSS_EXACT_MAP.check_sexe_f, 9.5);
    }

    // Section 3: INPE & Médecin / Établissement
    if (inpe) drawArrayOfBoxes(inpe, CNSS_EXACT_MAP.inpe, 8.5);
    if (etablissementInpe) drawArrayOfBoxes(etablissementInpe, CNSS_EXACT_MAP.inpe_etablissement, 8.5);

    if (doctorName) {
      const docLabel = doctorSpecialty ? `${doctorName} - ${doctorSpecialty}` : doctorName;
      drawTextInZone(docLabel, CNSS_EXACT_MAP.medecin_traitant_nom, 8.0);
    }
    if (etablissementName) {
      drawTextInZone(etablissementName, CNSS_EXACT_MAP.etablissement_soins_nom, 8.0);
    }

    // Section 4: Type de soins
    const typeSoins = (dbConsultation?.type_soins || 'Maladie').toLowerCase();
    if (typeSoins.includes('matern')) {
      drawCheck(CNSS_EXACT_MAP.check_maternite, 10.0);
    } else if (typeSoins.includes('hospit')) {
      drawCheck(CNSS_EXACT_MAP.check_hospitalisation, 10.0);
    } else if (typeSoins.includes('accid')) {
      drawCheck(CNSS_EXACT_MAP.check_accident, 10.0);
    } else {
      drawCheck(CNSS_EXACT_MAP.check_maladie, 10.0);
    }

    // Section 5: Signatures, Villes & Dates
    if (city) {
      drawTextInZone(city, CNSS_EXACT_MAP.fait_a_assure, 8.0);
      drawTextInZone(city, CNSS_EXACT_MAP.fait_a_medecin, 8.0);
    }
    if (consultDate8) {
      drawArrayOfBoxes(consultDate8, CNSS_EXACT_MAP.date_bas_gauche, 8.0);
      drawArrayOfBoxes(consultDate8, CNSS_EXACT_MAP.date_bas_droite, 8.0);
    }

    // 6. Output PDF
    const pdfBytes = await finalDoc.save();

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `FSE_${dbPatient?.last_name || 'Patient'}_CNSS.pdf`;
      link.click();
      return link.href;
    }

    return pdfBytes;
  } catch (error) {
    console.error('Erreur génération FSE :', error);
    throw error;
  }
};

export const mockPatients = [
  { id: 1, first_name: "Youssef", last_name: "Alaoui", nomComplet: "Youssef Alaoui", nomPrenom: "Youssef Alaoui", sexe: "M", gender: "M", cin: "AB123456", immatriculation: "112233445", cnss_number: "112233445", dateNaissance: "15051990", date_of_birth: "15/05/1990", adresse: "24 Boulevard d'Anfa, Quartier Gauthier, Casablanca", address: "24 Boulevard d'Anfa, Quartier Gauthier, Casablanca", ville: "Casablanca", telephone: "+212 661 11 22 33", mutuelle: "CNSS", montant: 500, piecesJointes: 1 },
  { id: 2, first_name: "Fatima Zahra", last_name: "Bennani", nomComplet: "Fatima Zahra Bennani", nomPrenom: "Fatima Zahra Bennani", sexe: "F", gender: "F", cin: "CD987654", immatriculation: "998877665", cnss_number: "998877665", dateNaissance: "22111985", date_of_birth: "22/11/1985", adresse: "12 Rue de Fès, Quartier Agdal, Rabat", address: "12 Rue de Fès, Quartier Agdal, Rabat", ville: "Rabat", telephone: "+212 662 22 33 44", mutuelle: "CNSS", montant: 300, piecesJointes: 1 },
  { id: 3, first_name: "Karim", last_name: "Tazi", nomComplet: "Karim Tazi", nomPrenom: "Karim Tazi", sexe: "M", gender: "M", cin: "EE556677", immatriculation: "102938475", cnss_number: "102938475", dateNaissance: "08022000", date_of_birth: "08/02/2000", adresse: "56 Avenue Hassan II, Temara, Maroc", address: "56 Avenue Hassan II, Temara, Maroc", ville: "Temara", telephone: "+212 663 33 44 55", mutuelle: "CNSS", montant: 150, piecesJointes: 2 },
  { id: 4, first_name: "Meryem", last_name: "Chraibi", nomComplet: "Meryem Chraibi", nomPrenom: "Meryem Chraibi", sexe: "F", gender: "F", cin: "BH112233", immatriculation: "564738291", cnss_number: "564738291", dateNaissance: "30071992", date_of_birth: "30/07/1992", adresse: "88 Boulevard Zerktouni, Salé, Maroc", address: "88 Boulevard Zerktouni, Salé, Maroc", ville: "Salé", telephone: "+212 664 44 55 66", mutuelle: "CNSS", montant: 250, piecesJointes: 1 },
  { id: 5, first_name: "Omar", last_name: "Idrissi", nomComplet: "Omar Idrissi", nomPrenom: "Omar Idrissi", sexe: "M", gender: "M", cin: "ZG889900", immatriculation: "192837465", cnss_number: "192837465", dateNaissance: "12121978", date_of_birth: "12/12/1978", adresse: "34 Avenue Pasteur, Kenitra, Maroc", address: "34 Avenue Pasteur, Kenitra, Maroc", ville: "Kenitra", telephone: "+212 665 55 66 77", mutuelle: "CNSS", montant: 400, piecesJointes: 3 },
  { id: 6, first_name: "Sara", last_name: "Bennis", nomComplet: "Sara Bennis", nomPrenom: "Sara Bennis", sexe: "F", gender: "F", cin: "AE445566", immatriculation: "918273645", cnss_number: "918273645", dateNaissance: "05041995", date_of_birth: "05/04/1995", adresse: "72 Rue Jean Jaurès, Mohammedia, Maroc", address: "72 Rue Jean Jaurès, Mohammedia, Maroc", ville: "Mohammedia", telephone: "+212 666 66 77 88", mutuelle: "CNSS", montant: 200, piecesJointes: 1 },
  { id: 7, first_name: "Mehdi", last_name: "El Fassi", nomComplet: "Mehdi El Fassi", nomPrenom: "Mehdi El Fassi", sexe: "M", gender: "M", cin: "BK334455", immatriculation: "112211223", cnss_number: "112211223", dateNaissance: "19091988", date_of_birth: "19/09/1988", adresse: "19 Boulevard Mohammed V, Quartier Hassan, Rabat", address: "19 Boulevard Mohammed V, Quartier Hassan, Rabat", ville: "Rabat", telephone: "+212 667 77 88 99", mutuelle: "CNSS", montant: 600, piecesJointes: 2 },
  { id: 8, first_name: "Najat", last_name: "Lahlou", nomComplet: "Najat Lahlou", nomPrenom: "Najat Lahlou", sexe: "F", gender: "F", cin: "CB223344", immatriculation: "445566778", cnss_number: "445566778", dateNaissance: "25011965", date_of_birth: "25/01/1965", adresse: "41 Avenue du 2 Mars, Casablanca, Maroc", address: "41 Avenue du 2 Mars, Casablanca, Maroc", ville: "Casablanca", telephone: "+212 668 88 99 00", mutuelle: "CNSS", montant: 150, piecesJointes: 1 },
  { id: 9, first_name: "Amine", last_name: "Kettani", nomComplet: "Amine Kettani", nomPrenom: "Amine Kettani", sexe: "M", gender: "M", cin: "WA778899", immatriculation: "334455667", cnss_number: "334455667", dateNaissance: "14062002", date_of_birth: "14/06/2002", adresse: "103 Boulevard Abdelmoumen, Tanger, Maroc", address: "103 Boulevard Abdelmoumen, Tanger, Maroc", ville: "Tanger", telephone: "+212 669 99 00 11", mutuelle: "CNSS", montant: 350, piecesJointes: 1 },
  { id: 10, first_name: "Houda", last_name: "Berrada", nomComplet: "Houda Berrada", nomPrenom: "Houda Berrada", sexe: "F", gender: "F", cin: "PA112211", immatriculation: "990011223", cnss_number: "990011223", dateNaissance: "03111999", date_of_birth: "03/11/1999", adresse: "27 Avenue Hassan II, Ville Nouvelle, Fès", address: "27 Avenue Hassan II, Ville Nouvelle, Fès", ville: "Fès", telephone: "+212 670 12 34 56", mutuelle: "CNSS", montant: 200, piecesJointes: 1 },
  { id: 11, first_name: "Tariq", last_name: "Mansouri", nomComplet: "Tariq Mansouri", nomPrenom: "Tariq Mansouri", sexe: "M", gender: "M", cin: "AB998877", immatriculation: "556677889", cnss_number: "556677889", dateNaissance: "27081983", date_of_birth: "27/08/1983", adresse: "63 Boulevard d'Alsace Lorraine, Meknès, Maroc", address: "63 Boulevard d'Alsace Lorraine, Meknès, Maroc", ville: "Meknès", telephone: "+212 671 23 45 67", mutuelle: "CNSS", montant: 450, piecesJointes: 2 },
  { id: 12, first_name: "Leila", last_name: "Guessous", nomComplet: "Leila Guessous", nomPrenom: "Leila Guessous", sexe: "F", gender: "F", cin: "CD665544", immatriculation: "223344556", cnss_number: "223344556", dateNaissance: "11031991", date_of_birth: "11/03/1991", adresse: "9 Rue de la Plage, Agadir, Maroc", address: "9 Rue de la Plage, Agadir, Maroc", ville: "Agadir", telephone: "+212 672 34 56 78", mutuelle: "CNSS", montant: 300, piecesJointes: 1 },
  { id: 13, first_name: "Yassine", last_name: "Filali", nomComplet: "Yassine Filali", nomPrenom: "Yassine Filali", sexe: "M", gender: "M", cin: "EE332211", immatriculation: "778899001", cnss_number: "778899001", dateNaissance: "09101975", date_of_birth: "09/10/1975", adresse: "15 Boulevard de Bir Anzarane, Rabat, Maroc", address: "15 Boulevard de Bir Anzarane, Rabat, Maroc", ville: "Rabat", telephone: "+212 673 45 67 89", mutuelle: "CNSS", montant: 500, piecesJointes: 1 },
  { id: 14, first_name: "Khadija", last_name: "Benjelloun", nomComplet: "Khadija Benjelloun", nomPrenom: "Khadija Benjelloun", sexe: "F", gender: "F", cin: "BH990088", immatriculation: "112233445", cnss_number: "112233445", dateNaissance: "16021960", date_of_birth: "16/02/1960", adresse: "29 Rue Ibn Aicha, Maarif, Casablanca", address: "29 Rue Ibn Aicha, Maarif, Casablanca", ville: "Casablanca", telephone: "+212 674 56 78 90", mutuelle: "CNSS", montant: 150, piecesJointes: 1 },
  { id: 15, first_name: "Ilyas", last_name: "Naciri", nomComplet: "Ilyas Naciri", nomPrenom: "Ilyas Naciri", sexe: "M", gender: "M", cin: "ZG443322", immatriculation: "667788990", cnss_number: "667788990", dateNaissance: "21071996", date_of_birth: "21/07/1996", adresse: "50 Boulevard Mohammed VI, Marrakech, Maroc", address: "50 Boulevard Mohammed VI, Marrakech, Maroc", ville: "Marrakech", telephone: "+212 675 67 89 01", mutuelle: "CNSS", montant: 250, piecesJointes: 1 },
  { id: 16, first_name: "Asma", last_name: "Amrani", nomComplet: "Asma Amrani", nomPrenom: "Asma Amrani", sexe: "F", gender: "F", cin: "AE119922", immatriculation: "334455667", cnss_number: "334455667", dateNaissance: "04121989", date_of_birth: "04/12/1989", adresse: "18 Rue Al Marrakchi, Rabat, Maroc", address: "18 Rue Al Marrakchi, Rabat, Maroc", ville: "Rabat", telephone: "+212 676 78 90 12", mutuelle: "CNSS", montant: 400, piecesJointes: 2 },
  { id: 17, first_name: "Reda", last_name: "Sefrioui", nomComplet: "Reda Sefrioui", nomPrenom: "Reda Sefrioui", sexe: "M", gender: "M", cin: "BK887766", immatriculation: "998877665", cnss_number: "998877665", dateNaissance: "29051981", date_of_birth: "29/05/1981", adresse: "77 Boulevard Al Qods, Oujda, Maroc", address: "77 Boulevard Al Qods, Oujda, Maroc", ville: "Oujda", telephone: "+212 677 89 01 23", mutuelle: "CNSS", montant: 350, piecesJointes: 1 },
  { id: 18, first_name: "Salma", last_name: "Hachimi", nomComplet: "Salma Hachimi", nomPrenom: "Salma Hachimi", sexe: "F", gender: "F", cin: "CB554433", immatriculation: "102938475", cnss_number: "102938475", dateNaissance: "18081994", date_of_birth: "18/08/1994", adresse: "14 Avenue des FAR, Tétouan, Maroc", address: "14 Avenue des FAR, Tétouan, Maroc", ville: "Tétouan", telephone: "+212 678 90 12 34", mutuelle: "CNSS", montant: 200, piecesJointes: 1 },
  { id: 19, first_name: "Hamza", last_name: "El Ouardi", nomComplet: "Hamza El Ouardi", nomPrenom: "Hamza El Ouardi", sexe: "M", gender: "M", cin: "WA221100", immatriculation: "564738291", cnss_number: "564738291", dateNaissance: "07062001", date_of_birth: "07/06/2001", adresse: "33 Rue Moulay Ismail, Kénitra, Maroc", address: "33 Rue Moulay Ismail, Kénitra, Maroc", ville: "Kénitra", telephone: "+212 679 01 23 45", mutuelle: "CNSS", montant: 150, piecesJointes: 1 },
  { id: 20, first_name: "Zineb", last_name: "Benali", nomComplet: "Zineb Benali", nomPrenom: "Zineb Benali", sexe: "F", gender: "F", cin: "PA334455", immatriculation: "192837465", cnss_number: "192837465", dateNaissance: "13011987", date_of_birth: "13/01/1987", adresse: "89 Boulevard Panoramique, Casablanca, Maroc", address: "89 Boulevard Panoramique, Casablanca, Maroc", ville: "Casablanca", telephone: "+212 680 12 34 56", mutuelle: "CNSS", montant: 500, piecesJointes: 1 }
];

export const mockPatientsEdgeCases = [
  { 
    id: 1, 
    nomComplet: "Moulay Abderrahmane El Idrissi Alaoui", // Extremely long name
    sexe: "M", 
    cin: "AB123456", 
    immatriculation: "112233445", 
    dateNaissance: "15051990", 
    adresse: "Appartement 45, Résidence Les Jardins, Boulevard de la Corniche, Harhoura, Temara, 12000, Maroc", // Extremely long address
    montant: 15000.50, // 7-digit price
    piecesJointes: 15 // Double-digit attachments
  },
  { 
    id: 2, 
    nomComplet: "Lalla Fatima Zahra Bint Mohammed Cherkaoui", 
    sexe: "F", 
    cin: "CD987654", 
    immatriculation: "998877665", 
    dateNaissance: "22111985", 
    adresse: "Secteur 22, Immeuble B, 4ème étage, Avenue Hassan II, Quartier Agdal, Rabat", 
    montant: 300, 
    piecesJointes: 0 // Zero attachments 
  },
  { 
    id: 3, 
    nomComplet: "Jean-Baptiste Marie François De La Croix", 
    sexe: "M", 
    cin: "EE556677", 
    immatriculation: "102938475", 
    dateNaissance: "08022000", 
    adresse: "Lot 14, Zone Industrielle, Route de Casablanca, BP 1054", 
    montant: 150.75, // Decimal price
    piecesJointes: 7 
  }
];
