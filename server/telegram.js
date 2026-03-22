const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`

/**
 * Send a message to a specific Telegram chat ID
 */
export async function sendTelegramMessage(chatId, text, replyMarkup = null) {
  if (!TELEGRAM_TOKEN) return

  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  }

  if (replyMarkup) {
    body.reply_markup = replyMarkup
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    
    if (!response.ok) {
      console.error('Telegram API error:', await response.text())
    }
  } catch (err) {
    console.error('Failed to send Telegram message:', err)
  }
}

/**
 * Sets the webhook URL for the bot
 */
export async function setTelegramWebhook(url) {
  if (!TELEGRAM_TOKEN) return
  
  const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  })
  
  return response.json()
}
