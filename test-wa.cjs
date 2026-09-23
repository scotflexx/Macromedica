const axios = require('axios');
require('dotenv').config();

/**
 * 1. The Phone Number "Antigravity" Cleaner
 * Formats Moroccan numbers to E.164 strictly without the + sign (e.g. 212612345678)
 */
function formatMoroccanNumber(inputNumber) {
  // 1. Strip out all spaces, dashes, and + signs
  let cleaned = String(inputNumber || '').replace(/\D/g, '');

  // 2. If the user typed a leading 0 (e.g., 06... or 07...), remove the 0 and add 212
  if (cleaned.startsWith('0')) {
    cleaned = '212' + cleaned.substring(1);
  } 
  // 3. If they forgot the 0 and just typed 6... or 7...
  else if (!cleaned.startsWith('212')) {
    cleaned = '212' + cleaned;
  }
  
  // Return the perfectly formatted number
  return cleaned;
}

/**
 * 2. Send Appointment Reminder Template
 * Template name in Meta: appointment_reminder
 * Body: "Bonjour {{1}}, votre prochaine consultation est prévue le {{2}}."
 */
async function sendAppointmentReminder(rawPhone, patientName = 'Ahmed', appointmentDate = '25 Septembre à 14h30') {
  const safeWhatsAppNumber = formatMoroccanNumber(rawPhone);
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;

  if (!phoneNumberId || !token) {
    console.error('❌ Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_TOKEN in .env');
    return;
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: safeWhatsAppNumber,
    type: 'template',
    template: {
      name: 'appointment_reminder',
      language: { code: 'fr' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: patientName },       // Replaces {{1}}
            { type: 'text', text: appointmentDate }    // Replaces {{2}}
          ]
        }
      ]
    }
  };

  console.log(`📡 Envoi du rappel RDV (appointment_reminder) vers ${safeWhatsAppNumber}...`);
  console.log(`👤 Patient: "${patientName}", 📅 Date: "${appointmentDate}"`);

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`✅ Reminder sent to ${safeWhatsAppNumber}! ID:`, response.data.messages[0].id);
    return response.data;
  } catch (error) {
    console.error('❌ WhatsApp Error:', error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message);
  }
}

/**
 * Send standard hello_world test template
 */
async function testWhatsAppHelloWorld(rawPhone) {
  const safeWhatsAppNumber = formatMoroccanNumber(rawPhone);
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: safeWhatsAppNumber,
    type: 'template',
    template: {
      name: 'hello_world',
      language: { code: 'en_US' }
    }
  };

  console.log(`📡 Envoi du template 'hello_world' vers ${safeWhatsAppNumber}...`);

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`✅ WhatsApp API Success! Message ID:`, response.data.messages[0].id);
    return response.data;
  } catch (error) {
    console.error('❌ WhatsApp Error:', error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message);
  }
}

// CLI handler
const args = process.argv.slice(2);
const phoneInput = args[0];
const mode = args[1] || 'reminder'; // 'reminder' or 'hello'
const patient = args[2] || 'Ahmed';
const date = args[3] || '25 Septembre à 14h30';

if (!phoneInput || phoneInput.includes('X')) {
  console.log('--- Test WhatsApp Cloud API ---');
  console.log('Usage:');
  console.log('  node test-wa.cjs <telephone> [reminder|hello] [nomPatient] [dateRdv]');
  console.log('Exemples :');
  console.log('  node test-wa.cjs "06 12 34 56 78" reminder "Youssef Alaoui" "Demain à 10h00"');
  console.log('  node test-wa.cjs "06 12 34 56 78" hello');
} else {
  if (mode === 'hello') {
    testWhatsAppHelloWorld(phoneInput);
  } else {
    sendAppointmentReminder(phoneInput, patient, date);
  }
}

module.exports = {
  formatMoroccanNumber,
  sendAppointmentReminder,
  testWhatsAppHelloWorld,
};
