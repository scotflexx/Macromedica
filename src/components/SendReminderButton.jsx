import React, { useState } from 'react';
import { sendRdvWhatsApp, formatMoroccanNumber } from '../controllers/whatsappController';

/**
 * SendReminderButton Component for MacroMedica
 * 
 * Props:
 * @param {string} patientName - Name of patient (e.g., "Youssef El Amrani")
 * @param {string} phoneNumber - Patient phone number (e.g., "0643326044")
 * @param {string} [appointmentTime] - Optional appointment time
 * @param {string} [languageCode] - Template language code ('fr' or 'en')
 */
export default function SendReminderButton({ 
  patientName, 
  phoneNumber, 
  appointmentTime = '10:30 AM',
  languageCode = 'en' 
}) {
  const [loading, setLoading] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSendReminder = async (e) => {
    e?.preventDefault();

    if (loading || sentSuccess) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Validate phone number before making network call
      const formattedNumber = formatMoroccanNumber(phoneNumber);
      console.log(`[SendReminderButton] Sending reminder to ${patientName} at formatted number: ${formattedNumber}`);

      // 2. Send WhatsApp message
      await sendRdvWhatsApp(phoneNumber, patientName, appointmentTime, languageCode);

      setSentSuccess(true);
    } catch (err) {
      console.error('❌ Error sending WhatsApp reminder:', err);
      setErrorMessage(err.message || 'Échec de l\'envoi du message WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleSendReminder}
        disabled={loading || sentSuccess}
        title={sentSuccess ? 'Rappel WhatsApp envoyé' : `Envoyer un rappel WhatsApp à ${patientName || 'le patient'}`}
        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center gap-1.5 shadow-sm ${
          sentSuccess
            ? 'bg-emerald-600 text-white cursor-default'
            : loading
            ? 'bg-blue-400 text-white cursor-not-allowed opacity-80'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
        }`}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-3.5 w-3.5 text-white shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Envoi...</span>
          </>
        ) : sentSuccess ? (
          <>
            <svg className="w-3.5 h-3.5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
            <span>Rappel envoyé</span>
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span>Rappel WhatsApp</span>
          </>
        )}
      </button>

      {errorMessage && (
        <span className="text-[11px] text-red-600 font-medium max-w-xs leading-tight">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
