/**
 * Strict Moroccan Regex Sanitization and Validation Schema
 * for FSE (Feuille de Soins Électronique) and Patient Intake Data.
 */

// Moroccan CIN format: 1 or 2 uppercase letters followed by 4 to 6 digits
export const MOROCCAN_CIN_REGEX = /^[A-Z]{1,2}\d{4,6}$/i;

/**
 * Sanitize CIN: Strip all whitespace and special characters, convert to uppercase.
 */
export function sanitizeCIN(rawCin) {
  if (!rawCin) return '';
  return String(rawCin).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Validate CIN against strict Moroccan format.
 */
export function isValidCIN(rawCin) {
  const cleaned = sanitizeCIN(rawCin);
  return MOROCCAN_CIN_REGEX.test(cleaned);
}

/**
 * Sanitize INPE / Immatriculation CNSS: Strip all spaces, dashes, letters, and symbols (numeric only).
 */
export function sanitizeNumericOnly(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/\D/g, '');
}

/**
 * Validate strictly numeric string (INPE, Immatriculation).
 */
export function isValidNumericCode(val, minLen = 1) {
  const cleaned = sanitizeNumericOnly(val);
  return cleaned.length >= minLen && /^\d+$/.test(cleaned);
}

/**
 * Validation schema definitions for Patient and Doctor intake data.
 */
export const FSE_VALIDATION_SCHEMA = {
  cin: {
    field: 'cin',
    label: 'N° CIN',
    pattern: MOROCCAN_CIN_REGEX,
    sanitize: sanitizeCIN,
    validate: (val) => Boolean(val && isValidCIN(val)),
    errorMessage: 'Le CIN doit strictement respecter le format marocain : 1 ou 2 lettres suivies de 4 à 6 chiffres (ex: AB123456).',
  },
  immatriculation: {
    field: 'immatriculation',
    label: 'N° Immatriculation CNSS',
    pattern: /^\d+$/,
    sanitize: sanitizeNumericOnly,
    validate: (val) => Boolean(val && isValidNumericCode(val, 6)),
    errorMessage: "L'immatriculation CNSS doit être strictement numérique (au moins 6 chiffres).",
  },
  inpe: {
    field: 'inpe',
    label: 'Code INPE Médecin / Établissement',
    pattern: /^\d+$/,
    sanitize: sanitizeNumericOnly,
    validate: (val) => !val || isValidNumericCode(val, 5),
    errorMessage: 'Le code INPE doit être strictement numérique.',
  },
};

/**
 * Sanitize a patient record before DB persist or PDF injection.
 */
export function sanitizePatientData(patient = {}) {
  const rawCin = patient.cin || '';
  const rawCnss = patient.immatriculation || patient.cnss_number || patient.numero_cnss || '';

  return {
    ...patient,
    cin: sanitizeCIN(rawCin),
    immatriculation: sanitizeNumericOnly(rawCnss),
    cnss_number: sanitizeNumericOnly(rawCnss),
    numero_cnss: sanitizeNumericOnly(rawCnss),
  };
}

/**
 * Sanitize doctor profile data before PDF injection.
 */
export function sanitizeDoctorData(doctor = {}) {
  const rawInpe = doctor.inpe_code || doctor.inpe || '';
  const rawEtabInpe = doctor.etablissement_inpe || doctor.inpe_etablissement || '';

  return {
    ...doctor,
    inpe_code: sanitizeNumericOnly(rawInpe),
    inpe: sanitizeNumericOnly(rawInpe),
    etablissement_inpe: sanitizeNumericOnly(rawEtabInpe),
    inpe_etablissement: sanitizeNumericOnly(rawEtabInpe),
  };
}

/**
 * Comprehensive FSE data validation schema and validator.
 */
export function validateFseData(patient = {}, doctor = {}, consultation = {}) {
  const errors = [];
  const warnings = [];

  const sanitizedPatient = sanitizePatientData(patient);
  const sanitizedDoctor = sanitizeDoctorData(doctor);

  // 1. Patient Name
  const fullName = (
    sanitizedPatient.nomComplet ||
    sanitizedPatient.nomPrenom ||
    sanitizedPatient.name ||
    `${sanitizedPatient.first_name || sanitizedPatient.prenom || ''} ${sanitizedPatient.last_name || sanitizedPatient.nom || ''}`.trim()
  );
  if (!fullName) {
    errors.push('Nom du patient manquant.');
  }

  // 2. CIN Validation
  if (!sanitizedPatient.cin) {
    warnings.push('N° CIN manquant.');
  } else if (!isValidCIN(sanitizedPatient.cin)) {
    errors.push(
      `N° CIN "${sanitizedPatient.cin}" invalide. Format attendu : 1 ou 2 lettres suivies de 4 à 6 chiffres (ex: AB123456).`
    );
  }

  // 3. Immatriculation CNSS Validation
  const cnss = sanitizedPatient.immatriculation;
  if (!cnss) {
    warnings.push('N° Immatriculation CNSS manquant.');
  } else if (!/^\d+$/.test(cnss)) {
    errors.push("L'immatriculation CNSS doit être strictement numérique.");
  }

  // 4. Date of Birth
  const dob = sanitizedPatient.date_of_birth || sanitizedPatient.dateNaissance || sanitizedPatient.date_naissance;
  if (!dob) {
    warnings.push('Date de naissance manquante.');
  }

  // 5. Doctor INPE Validation (if provided)
  if (sanitizedDoctor.inpe_code && !/^\d+$/.test(sanitizedDoctor.inpe_code)) {
    errors.push('Le code INPE du médecin doit être strictement numérique.');
  }
  if (sanitizedDoctor.etablissement_inpe && !/^\d+$/.test(sanitizedDoctor.etablissement_inpe)) {
    errors.push("Le code INPE de l'établissement doit être strictement numérique.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitized: {
      patient: sanitizedPatient,
      doctor: sanitizedDoctor,
      consultation,
    },
  };
}
