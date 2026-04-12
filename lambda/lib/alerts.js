import { getAllAlertClients } from "./alertClient.js";

/**
 * High-level notify function that broadcasts to all providers.
 */
export async function notify(message, isSuccess = false) {
  const subject = isSuccess ? "✅ Lambda executed successfully" : "❌ Lambda execution failed";
  const emoji = isSuccess ? "✅" : "❌";
  const formattedMessage = `${emoji} *Cryptic Owl Lambda ${isSuccess ? "Success" : "Failure"}*\n\n${message}`;

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
