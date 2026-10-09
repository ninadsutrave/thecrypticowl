import { getAllAlertClients } from '../clients/alertClient.js';
import {
  NOTIFICATION_SUBJECTS,
  NOTIFICATION_EMOJIS,
  NOTIFICATION_TITLES,
} from '../constants/alerts.js';

/**
 * Broadcast an alert to every configured channel.
 *
 * All channels receive the same formatted body. Previously SNS got the
 * formatted message and Telegram got the raw one, so the Telegram alert
 * arrived with no emoji, no title, and no indication of whether it was
 * reporting success or failure — the one channel a human actually reads.
 *
 * `source` names the Lambda in the alert title, so seven daily runs sharing
 * one Telegram chat stay distinguishable at a glance.
 *
 * Delivery is best-effort by design: a broken alert channel must never fail
 * the run it is reporting on, so every rejection is swallowed and logged.
 */
export async function notify(message, isSuccess = false, source = 'Cryptic Owl Lambda') {
  const statusKey = isSuccess ? 'SUCCESS' : 'FAILURE';
  const subject = NOTIFICATION_SUBJECTS[statusKey];
  const emoji = NOTIFICATION_EMOJIS[statusKey];
  const title = NOTIFICATION_TITLES[statusKey];

  const formatted = `${emoji} *${source} ${title}*\n\n${message}`;

  const results = await Promise.allSettled(
    getAllAlertClients().map(client => client(formatted, { subject }))
  );

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`Alert channel #${i} failed:`, r.reason?.message ?? r.reason);
    }
  });
}
