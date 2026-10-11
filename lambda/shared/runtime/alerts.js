import { getAllAlertClients } from '../clients/alertClient.js';
import { NOTIFICATION_EMOJIS, NOTIFICATION_TITLES } from '../constants/alerts.js';

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
/** "CrypticOwl : 11 Oct 2026", dated in India time: a day's alerts share it, so they thread. */
export function emailSubject(date = new Date()) {
  const day = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
  return `CrypticOwl : ${day}`;
}

/**
 * Bold in a plain-text email: SNS sends no formatting, so letters and digits
 * become their Unicode "mathematical sans-serif bold" forms, which mail apps
 * show as bold text.
 */
export function boldText(text) {
  return [...String(text)]
    .map(ch => {
      const c = ch.codePointAt(0);
      if (c >= 65 && c <= 90) return String.fromCodePoint(0x1d5d4 + c - 65);
      if (c >= 97 && c <= 122) return String.fromCodePoint(0x1d5ee + c - 97);
      if (c >= 48 && c <= 57) return String.fromCodePoint(0x1d7ec + c - 48);
      return ch;
    })
    .join('');
}

/** "Variant Sudoku Lambda" → "Variant Sudoku": the puzzle the alert is about. */
export function puzzleName(source) {
  return String(source).replace(/\s*Lambda$/i, '');
}

export async function notify(message, isSuccess = false, source = 'British Style Cryptics') {
  const statusKey = isSuccess ? 'SUCCESS' : 'FAILURE';
  const emoji = NOTIFICATION_EMOJIS[statusKey];
  const title = NOTIFICATION_TITLES[statusKey];
  const name = puzzleName(source);

  // Telegram renders *bold*; the email gets Unicode bold, and a subject all
  // of the day's alerts share so the inbox threads them by date.
  const formatted = `${emoji} *${name}* ${title}\n\n${message}`;
  const email = `${boldText(name)}\n${emoji} ${title}\n\n${message}`;

  const results = await Promise.allSettled(
    getAllAlertClients().map(client => client(formatted, { subject: emailSubject(), email }))
  );

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`Alert channel #${i} failed:`, r.reason?.message ?? r.reason);
    }
  });
}
