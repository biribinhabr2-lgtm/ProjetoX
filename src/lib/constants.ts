export const SUPPORT_WHATSAPP = '5522997385987'
export const SUPPORT_WHATSAPP_DISPLAY = '(22) 99738-5987'
export const supportWhatsAppLink = (msg?: string) =>
  `https://wa.me/${SUPPORT_WHATSAPP}` + (msg ? `?text=${encodeURIComponent(msg)}` : '')
