import { 
  TELEGRAM_BASE_URL, 
  TELEGRAM_METHODS, 
  TELEGRAM_HEADERS, 
  TELEGRAM_PARSE_MODE, 
  TELEGRAM_ALERT_PREFIX 
} from "../../constants/telegram.js";
import { HTTP_METHODS } from "../../constants/gemini.js";

/**
 * Telegram Alert Provider
 */
export async function sendTelegramAlert(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("Telegram token or chat ID missing. Skipping alert.");
    return;
  }

  const url = `${TELEGRAM_BASE_URL}${token}/${TELEGRAM_METHODS.SEND_MESSAGE}`;
  try {
    const response = await fetch(url, {
      method: HTTP_METHODS.POST,
      headers: TELEGRAM_HEADERS,
      body: JSON.stringify({
        chat_id: chatId,
        text: `${TELEGRAM_ALERT_PREFIX}\n\n${message}`,
        parse_mode: TELEGRAM_PARSE_MODE,
      }),
    });
    if (!response.ok) {
      console.error("Telegram API error:", await response.text());
    }
  } catch (e) {
    console.error("Failed to send Telegram alert:", e.message);
  }
}
