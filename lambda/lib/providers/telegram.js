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

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🚨 *Cryptic Owl Lambda Alert*\n\n${message}`,
        parse_mode: "Markdown",
      }),
    });
    if (!response.ok) {
      console.error("Telegram API error:", await response.text());
    }
  } catch (e) {
    console.error("Failed to send Telegram alert:", e.message);
  }
}
