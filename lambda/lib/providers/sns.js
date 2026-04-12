import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const sns = new SNSClient({ region: process.env.AWS_REGION || "ap-south-1" });

/**
 * SNS Alert Provider
 */
export async function notifySNS(message, options = {}) {
  const topicArn = process.env.SNS_TOPIC_ARN;
  if (!topicArn) {
    console.warn("SNS Topic ARN missing. Skipping SNS notification.");
    return;
  }

  const { subject = "Cryptic Owl Lambda Alert" } = options;

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
