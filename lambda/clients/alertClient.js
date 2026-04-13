import { sendTelegramAlert } from "./providers/telegram.js";
import { notifySNS } from "./providers/sns.js";

/**
 * Alert Client Factory
 * Returns a specific alert provider or a composite one.
 */
export function getAlertClient(provider) {
  switch (provider.toLowerCase()) {
    case "telegram":
      return sendTelegramAlert;
    case "sns":
      return notifySNS;
    default:
      throw new Error(`Unsupported alert provider: ${provider}`);
  }
}

/**
 * Returns all configured alert providers
 */
export function getAllAlertClients() {
  return [sendTelegramAlert, notifySNS];
}
