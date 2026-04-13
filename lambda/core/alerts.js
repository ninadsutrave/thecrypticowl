import { getAllAlertClients } from "../clients/alertClient.js";
import { 
  NOTIFICATION_SUBJECTS, 
  NOTIFICATION_EMOJIS, 
  NOTIFICATION_TITLES 
} from "../constants/alerts.js";

/**
 * High-level notify function that broadcasts to all providers.
 */
export async function notify(message, isSuccess = false) {
  const statusKey = isSuccess ? "SUCCESS" : "FAILURE";
  const subject = NOTIFICATION_SUBJECTS[statusKey];
  const emoji = NOTIFICATION_EMOJIS[statusKey];
  const title = NOTIFICATION_TITLES[statusKey];
  
  const formattedMessage = `${emoji} *Cryptic Owl Lambda ${title}*\n\n${message}`;

  const clients = getAllAlertClients();

  // Run all notifications in parallel
  await Promise.allSettled(
    clients.map(client => {
      // client could be telegram (1 arg) or sns (2 args)
      // providers are designed to handle their own options if needed
      if (client.name === "notifySNS") {
        return client(formattedMessage, { subject });
      }
      return client(message);
    })
  );
}
