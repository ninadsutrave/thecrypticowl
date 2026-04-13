import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { SNS_DEFAULT_REGION, SNS_DEFAULT_SUBJECT } from "../../constants/sns.js";

const sns = new SNSClient({ region: process.env.AWS_REGION || SNS_DEFAULT_REGION });

/**
 * SNS Alert Provider
 */
export async function notifySNS(message, options = {}) {
  const topicArn = process.env.SNS_TOPIC_ARN;
  if (!topicArn) {
    console.warn("SNS Topic ARN missing. Skipping SNS notification.");
    return;
  }

  const { subject = SNS_DEFAULT_SUBJECT } = options;

  try {
    await sns.send(
      new PublishCommand({
        TopicArn: topicArn,
        Message: message,
        Subject: subject,
      })
    );
  } catch (e) {
    console.error("Failed to send SNS notification:", e.message);
  }
}
