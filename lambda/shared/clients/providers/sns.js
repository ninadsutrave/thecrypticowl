import { SNS_DEFAULT_REGION, SNS_DEFAULT_SUBJECT } from '../../constants/sns.js';

/**
 * SNS alert provider.
 *
 * The AWS SDK is imported lazily, on the first alert that actually goes to
 * SNS. Two reasons:
 *
 *   1. Cold start. Most invocations succeed and alert over Telegram, or have
 *      no SNS topic configured at all. Loading the SDK at module scope made
 *      every run pay for it regardless.
 *   2. Testability. The lambda's own dependencies are installed under
 *      lambda/node_modules, so a top-level import of @aws-sdk/client-sns made
 *      anything that transitively reached this file unimportable from the
 *      root test runner — including the handler itself.
 */
let clientPromise = null;

async function getClient() {
  if (!clientPromise) {
    clientPromise = import('@aws-sdk/client-sns').then(({ SNSClient, PublishCommand }) => ({
      client: new SNSClient({ region: process.env.AWS_REGION || SNS_DEFAULT_REGION }),
      PublishCommand,
    }));
  }
  return clientPromise;
}

export async function notifySNS(message, options = {}) {
  const topicArn = process.env.SNS_TOPIC_ARN;
  if (!topicArn) {
    console.warn('SNS Topic ARN missing. Skipping SNS notification.');
    return;
  }

  // `kind` tags the message so a subscription can filter on it: the owner's
  // email subscribes to "stock" only, not to every run report.
  const { subject = SNS_DEFAULT_SUBJECT, kind = 'run' } = options;

  try {
    const { client, PublishCommand } = await getClient();
    await client.send(
      new PublishCommand({
        TopicArn: topicArn,
        Message: message,
        Subject: subject,
        MessageAttributes: { kind: { DataType: 'String', StringValue: kind } },
      })
    );
  } catch (e) {
    // Alerting must never be able to fail the run it is reporting on.
    console.error('Failed to send SNS notification:', e.message);
  }
}

/** Test seam — drops the memoised client so a fresh region/config is picked up. */
export function _resetSNSClient() {
  clientPromise = null;
}
