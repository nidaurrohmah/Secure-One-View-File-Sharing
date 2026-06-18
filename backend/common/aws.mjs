import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { SNSClient } from "@aws-sdk/client-sns";

export const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";

export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true }
});

export const s3 = new S3Client({ region });
export const sns = new SNSClient({ region });
