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
    'EAAQCeKPx73oBSlTBU3jqlgW0UTOhsorykMqNqL1ZBde0S92jGk99KZBGBkHAa20y7PUKvsXI6f8x22e43krK5ZARQsUNBc4ZAjpEMzumASUX8vwSDWXlaGySKqMiljMl8hQJkCEbADlaouKN8jb6zKWiyuP49IWv4keK5ZAg86hjHo8unHOsTrZB4PZCkx6u9rVkfs9nuajL5m5KSScTCRYhnL1t8AtQ6lqs9FFSz1UXDg9xLERhrjVvnJ9qWlVVDml6veuIZAecvdPtXmA5HvGZBAtyEkgZDZD'

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
    'EAAQCeKPx73oBSlTBU3jqlgW0UTOhsorykMqNqL1ZBde0S92jGk99KZBGBkHAa20y7PUKvsXI6f8x22e43krK5ZARQsUNBc4ZAjpEMzumASUX8vwSDWXlaGySKqMiljMl8hQJkCEbADlaouKN8jb6zKWiyuP49IWv4keK5ZAg86hjHo8unHOsTrZB4PZCkx6u9rVkfs9nuajL5m5KSScTCRYhnL1t8AtQ6lqs9FFSz1UXDg9xLERhrjVvnJ9qWlVVDml6veuIZAecvdPtXmA5HvGZBAtyEkgZDZD'

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
    'EAAQCeKPx73oBSlTBU3jqlgW0UTOhsorykMqNqL1ZBde0S92jGk99KZBGBkHAa20y7PUKvsXI6f8x22e43krK5ZARQsUNBc4ZAjpEMzumASUX8vwSDWXlaGySKqMiljMl8hQJkCEbADlaouKN8jb6zKWiyuP49IWv4keK5ZAg86hjHo8unHOsTrZB4PZCkx6u9rVkfs9nuajL5m5KSScTCRYhnL1t8AtQ6lqs9FFSz1UXDg9xLERhrjVvnJ9qWlVVDml6veuIZAecvdPtXmA5HvGZBAtyEkgZDZD'

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

/**
 * 4. Generate direct WhatsApp Web / App share link
 */
export function getWhatsAppShareUrl(phone: string, text: string): string {
  const safePhone = formatMoroccanNumber(phone)
  return `https://api.whatsapp.com/send?phone=${safePhone}&text=${encodeURIComponent(text)}`
}

/**
 * 5. Send Document via WhatsApp Cloud API
 */
export async function sendWhatsAppDocumentMessage({
  to,
  documentUrl,
  fileName = 'Feuille_de_Soins_CNSS.pdf',
  caption = 'Bonjour, voici votre document de soins médical CNSS.',
}: {
  to: string
  documentUrl: string
  fileName?: string
  caption?: string
}) {
  const safePhone = formatMoroccanNumber(to)

  const token =
    (typeof process !== 'undefined' && (process.env?.WHATSAPP_ACCESS_TOKEN || process.env?.WHATSAPP_TOKEN)) ||
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_WHATSAPP_ACCESS_TOKEN || import.meta.env?.VITE_WHATSAPP_TOKEN)) ||
    'EAAQCeKPx73oBSlTBU3jqlgW0UTOhsorykMqNqL1ZBde0S92jGk99KZBGBkHAa20y7PUKvsXI6f8x22e43krK5ZARQsUNBc4ZAjpEMzumASUX8vwSDWXlaGySKqMiljMl8hQJkCEbADlaouKN8jb6zKWiyuP49IWv4keK5ZAg86hjHo8unHOsTrZB4PZCkx6u9rVkfs9nuajL5m5KSScTCRYhnL1t8AtQ6lqs9FFSz1UXDg9xLERhrjVvnJ9qWlVVDml6veuIZAecvdPtXmA5HvGZBAtyEkgZDZD'

  const phoneNumberId =
    (typeof process !== 'undefined' && (process.env?.WHATSAPP_PHONE_ID || process.env?.WHATSAPP_PHONE_NUMBER_ID)) ||
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_WHATSAPP_PHONE_ID || import.meta.env?.VITE_WHATSAPP_PHONE_NUMBER_ID)) ||
    '1299172296618239'

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`

  const payload = {
    messaging_product: 'whatsapp',
    to: safePhone,
    type: 'document',
    document: {
      link: documentUrl,
      filename: fileName,
      caption: caption,
    },
  }

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    console.log('✅ Document WhatsApp envoyé avec succès:', response.data)
    return { success: true, data: response.data }
  } catch (error: any) {
    console.warn('WhatsApp API direct upload unavailable, generating web link fallback:', error?.response?.data || error?.message)
    return { success: false, error: error?.response?.data || error?.message }
  }
}

/**
 * 6. Send FSE PDF Document via WhatsApp (Hybrid: API document or Web Share Fallback)
 */
export async function sendFseViaWhatsApp({
  patientPhone,
  patientName,
  documentUrl,
  montantTotal,
}: {
  patientPhone: string
  patientName: string
  documentUrl?: string
  montantTotal?: string | number
}) {
  const safePhone = formatMoroccanNumber(patientPhone)
  const messageText = `Bonjour ${patientName || 'Cher patient'},\n\nVotre Feuille de Soins Électronique CNSS (Montant: ${montantTotal || '150'} MAD) a été générée avec succès par votre cabinet médical.\n\n${documentUrl ? `Téléchargez votre PDF FSE ici : ${documentUrl}` : 'Veuillez trouver votre document ci-joint.'}\n\nCordialement,`

  if (documentUrl && documentUrl.startsWith('http')) {
    const res = await sendWhatsAppDocumentMessage({
      to: safePhone,
      documentUrl,
      fileName: `FSE_${patientName ? patientName.replace(/\s+/g, '_') : 'Patient'}_CNSS.pdf`,
      caption: messageText,
    })
    if (res.success) return res
  }

  // Fallback: Open WhatsApp Web / App share window directly
  const shareUrl = getWhatsAppShareUrl(safePhone, messageText)
  if (typeof window !== 'undefined') {
    window.open(shareUrl, '_blank')
  }
  return { success: true, fallback: true, shareUrl }
}


