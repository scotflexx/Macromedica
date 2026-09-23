import axios from 'axios'

/**
 * 1. The Phone Number "Antigravity" Cleaner
 * Formats Moroccan numbers to E.164 strictly without the + sign (e.g. 212612345678)
 */
export function formatMoroccanNumber(inputNumber: string): string {
  // 1. Strip out all spaces, dashes, and + signs
  let cleaned = String(inputNumber || '').replace(/\D/g, '')

  // 2. If the user typed a leading 0 (e.g., 06... or 07...), remove the 0 and add 212
  if (cleaned.startsWith('0')) {
    cleaned = '212' + cleaned.substring(1)
  }
  // 3. If they forgot the 0 and just typed 6... or 7...
  else if (!cleaned.startsWith('212')) {
    cleaned = '212' + cleaned
  }

  // Return the perfectly formatted number
  return cleaned
}

export interface SendWhatsAppTemplateOptions {
  to: string
  templateName?: string
  languageCode?: string
  components?: any[]
}

/**
 * Send a generic WhatsApp Cloud API template message
 */
export async function sendWhatsAppTemplateMessage({
  to,
  templateName = 'hello_world',
  languageCode = 'en_US',
  components,
}: SendWhatsAppTemplateOptions) {
  const safeWhatsAppNumber = formatMoroccanNumber(to)

  const phoneNumberId =
    (typeof process !== 'undefined' && process.env?.WHATSAPP_PHONE_NUMBER_ID) ||
    '1299172296618239'

  const token =
    (typeof process !== 'undefined' && process.env?.WHATSAPP_TOKEN) ||
    'EAAQCeKPx73oBSl0DAI8xFhB6e8Kuhc2J9yVNmH06QclfryvZAYfnuna4c9jdfUFV2EEbjDCEKob4PLj0zl0VRwsrdES1xMY9FJmShGhh8Cs6PP5KvndAVX8V39aWaZClv3LJEtZAS0iaFyyrP9KDg0npQwRk6DBhlCJXw3rcPIMRKRL4HO9JZAXMofGnRFpVC5rXMUhkJ7XK24aRpnErSre6sreNZC7TQidgCjT0Fznu2G3dsYEg2ZAWysZCnAV0uTCzdlUT3cM5SZB1AcP2UOgSHQZDZD'

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`

  const payload: any = {
    messaging_product: 'whatsapp',
    to: safeWhatsAppNumber,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  }

  if (components && components.length > 0) {
    payload.template.components = components
  }

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  return response.data
}

/**
 * 2. Send Appointment Reminder Template Message
 * Template: "Bonjour {{1}}, votre prochaine consultation est prévue le {{2}}."
 */
export async function sendAppointmentReminder(
  rawPhone: string,
  patientName: string,
  appointmentDate: string
) {
  // Run the raw input through our cleaner first
  const safeWhatsAppNumber = formatMoroccanNumber(rawPhone)

  const phoneNumberId =
    (typeof process !== 'undefined' && process.env?.WHATSAPP_PHONE_NUMBER_ID) ||
    '1299172296618239'

  const token =
    (typeof process !== 'undefined' && process.env?.WHATSAPP_TOKEN) ||
    'EAAQCeKPx73oBSl0DAI8xFhB6e8Kuhc2J9yVNmH06QclfryvZAYfnuna4c9jdfUFV2EEbjDCEKob4PLj0zl0VRwsrdES1xMY9FJmShGhh8Cs6PP5KvndAVX8V39aWaZClv3LJEtZAS0iaFyyrP9KDg0npQwRk6DBhlCJXw3rcPIMRKRL4HO9JZAXMofGnRFpVC5rXMUhkJ7XK24aRpnErSre6sreNZC7TQidgCjT0Fznu2G3dsYEg2ZAWysZCnAV0uTCzdlUT3cM5SZB1AcP2UOgSHQZDZD'

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`

  const payload = {
    messaging_product: 'whatsapp',
    to: safeWhatsAppNumber,
    type: 'template',
    template: {
      name: 'appointment_reminder', // The name of the template created in Meta
      language: { code: 'fr' }, // French for the clinic
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: patientName }, // Replaces {{1}}
            { type: 'text', text: appointmentDate }, // Replaces {{2}}
          ],
        },
      ],
    },
  }

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    console.log(`✅ Reminder sent to ${safeWhatsAppNumber}! ID:`, response.data.messages[0].id)
    return { success: true, messageId: response.data.messages[0].id, data: response.data }
  } catch (error: any) {
    const errorData = error.response?.data || error.message
    console.error('❌ WhatsApp Error:', errorData)
    return { success: false, error: errorData }
  }
}

/**
 * 3. Send Appointment Confirmation Template Message
 * Template: "confirmation_rdv"
 * Language: "fr"
 * Parameters: {{1}} = patientName, {{2}} = dateString
 */
export async function sendRdvWhatsApp(
  phoneTo: string,
  patientName: string,
  dateString: string
) {
  const safePhone = formatMoroccanNumber(phoneTo)

  const token =
    (typeof process !== 'undefined' && (process.env?.WHATSAPP_ACCESS_TOKEN || process.env?.WHATSAPP_TOKEN)) ||
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_WHATSAPP_ACCESS_TOKEN || import.meta.env?.VITE_WHATSAPP_TOKEN)) ||
    'EAAQCeKPx73oBSl0DAI8xFhB6e8Kuhc2J9yVNmH06QclfryvZAYfnuna4c9jdfUFV2EEbjDCEKob4PLj0zl0VRwsrdES1xMY9FJmShGhh8Cs6PP5KvndAVX8V39aWaZClv3LJEtZAS0iaFyyrP9KDg0npQwRk6DBhlCJXw3rcPIMRKRL4HO9JZAXMofGnRFpVC5rXMUhkJ7XK24aRpnErSre6sreNZC7TQidgCjT0Fznu2G3dsYEg2ZAWysZCnAV0uTCzdlUT3cM5SZB1AcP2UOgSHQZDZD'

  const phoneNumberId =
    (typeof process !== 'undefined' && (process.env?.WHATSAPP_PHONE_ID || process.env?.WHATSAPP_PHONE_NUMBER_ID)) ||
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_WHATSAPP_PHONE_ID || import.meta.env?.VITE_WHATSAPP_PHONE_NUMBER_ID)) ||
    '1299172296618239'

  const TEMPLATE_NAME = 'confirmation_rdv'
  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`

  const payload = {
    messaging_product: 'whatsapp',
    to: safePhone,
    type: 'template',
    template: {
      name: TEMPLATE_NAME,
      language: { code: 'fr' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: patientName || 'Patient' },
            { type: 'text', text: dateString },
          ],
        },
      ],
    },
  }

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    console.log('WhatsApp confirmation sent successfully:', response.data)
    return response.data
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message)
    throw error
  }
}

