import { PublishCommand } from "@aws-sdk/client-sns";
import { sns } from "./aws.mjs";

export async function publishNotification(subject, message, attributes = {}) {
  if (!process.env.NOTIFICATIONS_TOPIC_ARN) return;

  try {
    await sns.send(new PublishCommand({
      TopicArn: process.env.NOTIFICATIONS_TOPIC_ARN,
      Subject: subject.slice(0, 100),
      Message: message,
      MessageAttributes: Object.fromEntries(
        Object.entries(attributes).map(([key, value]) => [
          key,
          { DataType: "String", StringValue: String(value ?? "") }
        ])
      )
    }));
  } catch (error) {
    console.warn("SNS_PUBLISH_SKIPPED", { name: error.name, message: error.message });
  }
}
