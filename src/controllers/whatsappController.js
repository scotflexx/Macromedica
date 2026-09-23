import axios from 'axios';

/**
 * Clean and format Moroccan phone number into strict E.164 without '+'
 * e.g., "06 12 34 56 78" -> "212612345678"
 */
export function formatMoroccanNumber(inputNumber) {
  let cleaned = String(inputNumber || '').replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '212' + cleaned.substring(1);
  } else if (!cleaned.startsWith('212')) {
    cleaned = '212' + cleaned;
  }
  return cleaned;
}

/**
 * Sends a WhatsApp appointment confirmation using Meta Cloud API
 * 
 * @param {string} phoneTo - The patient's phone number (e.g., "2126XXXXXXXX" or "06XXXXXXXX")
 * @param {string} patientName - Replaces {{1}} in the template
 * @param {string} dateString - Replaces {{2}} in the template (e.g., "25 Septembre à 14h30")
 */
export const sendRdvWhatsApp = async (phoneTo, patientName, dateString) => {
  // Grab these from environment variables with safe fallbacks for both Node and Vite/browser
  const ACCESS_TOKEN =
    (typeof process !== 'undefined' && (process.env?.WHATSAPP_ACCESS_TOKEN || process.env?.WHATSAPP_TOKEN)) ||
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_WHATSAPP_ACCESS_TOKEN || import.meta.env?.VITE_WHATSAPP_TOKEN)) ||
    'EAAQCeKPx73oBSl0DAI8xFhB6e8Kuhc2J9yVNmH06QclfryvZAYfnuna4c9jdfUFV2EEbjDCEKob4PLj0zl0VRwsrdES1xMY9FJmShGhh8Cs6PP5KvndAVX8V39aWaZClv3LJEtZAS0iaFyyrP9KDg0npQwRk6DBhlCJXw3rcPIMRKRL4HO9JZAXMofGnRFpVC5rXMUhkJ7XK24aRpnErSre6sreNZC7TQidgCjT0Fznu2G3dsYEg2ZAWysZCnAV0uTCzdlUT3cM5SZB1AcP2UOgSHQZDZD';

  const PHONE_NUMBER_ID =
    (typeof process !== 'undefined' && (process.env?.WHATSAPP_PHONE_ID || process.env?.WHATSAPP_PHONE_NUMBER_ID)) ||
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_WHATSAPP_PHONE_ID || import.meta.env?.VITE_WHATSAPP_PHONE_NUMBER_ID)) ||
    '1299172296618239';

  // Replace this with the exact name of the template submitted in Meta
  const TEMPLATE_NAME = "confirmation_rdv";

  const safePhone = formatMoroccanNumber(phoneTo);
  const url = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: safePhone,
    type: "template",
    template: {
      name: TEMPLATE_NAME,
      language: {
        code: "fr"
      },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: patientName || 'Patient'
            },
            {
              type: "text",
              text: dateString
            }
          ]
        }
      ]
    }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log("WhatsApp message sent successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error.response ? error.response.data : error.message);
    throw error;
  }
};

export default {
  sendRdvWhatsApp,
  formatMoroccanNumber
};
