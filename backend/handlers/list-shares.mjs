import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../common/aws.mjs";
import { getUser, handleAuthError } from "../common/auth.mjs";
import { badRequest, ok, serverError } from "../common/http.mjs";

async function queryBy(tableName, indexName, keyName, value) {
  let result;
  try {
    result = await ddb.send(new QueryCommand({
      TableName: tableName,
      IndexName: indexName,
      KeyConditionExpression: `${keyName} = :value`,
      ExpressionAttributeValues: { ":value": value },
      ScanIndexForward: false,
      Limit: 50
    }));
  } catch (error) {
    if (error.name !== "ValidationException") throw error;
    console.warn(`${indexName} tidak tersedia, fallback Scan dipakai.`);
    result = await ddb.send(new ScanCommand({
      TableName: tableName,
      FilterExpression: `${keyName} = :value`,
      ExpressionAttributeValues: { ":value": value },
      Limit: 50
    }));
  }
  return result.Items || [];
}

function publicShare(share) {
  return {
    shareId: share.shareId,
    id: share.shareId,
    token: share.token,
    fileId: share.fileId,
    fileName: share.fileName,
    fileSize: share.fileSize,
    contentType: share.contentType,
    senderId: share.senderId,
    senderEmail: share.senderEmail,
    senderName: share.senderName,
    recipientId: share.recipientId,
    recipientEmail: share.recipientEmail,
    recipientName: share.recipientName,
    status: share.status,
    createdAt: share.createdAt,
    expiresAt: share.expiresAt,
    viewedAt: share.viewedAt
  };
}

export const handler = async (event) => {
  try {
    const user = getUser(event);
    const sharesTable = process.env.SHARES_TABLE || process.env.SHARE_TABLE;
    if (!sharesTable) return badRequest("Environment variable SHARES_TABLE belum diset di Lambda list-shares.");

    const [sent, received] = await Promise.all([
      queryBy(sharesTable, "sender-index", "senderId", user.id),
      queryBy(sharesTable, "recipient-index", "recipientId", user.id)
    ]);

    return ok({
      ok: true,
      sent: sent.map(publicShare),
      received: received.map(publicShare)
    });
  } catch (error) {
    if (error.response) return handleAuthError(error);
    return serverError(error);
  }
};
