import { GetObjectCommand } from "@aws-sdk/client-s3";
import { GetCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ddb, s3 } from "../common/aws.mjs";
import { getUser, handleAuthError } from "../common/auth.mjs";
import { publishNotification } from "../common/notify.mjs";
import { badRequest, conflict, notFound, ok, parseJson, serverError } from "../common/http.mjs";
import { nowEpoch, nowIso } from "../common/ids.mjs";

export const handler = async (event) => {
  try {
    const user = getUser(event);
    const { token } = parseJson(event);
    const filesTable = process.env.FILES_TABLE || process.env.FILE_TABLE;
    const sharesTable = process.env.SHARES_TABLE || process.env.SHARE_TABLE;
    const fileBucket = process.env.FILE_BUCKET || process.env.S3_BUCKET;
    if (!token) return badRequest("Token wajib diisi.");
    if (!filesTable) return badRequest("Environment variable FILES_TABLE belum diset di Lambda validate-share.");
    if (!sharesTable) return badRequest("Environment variable SHARES_TABLE belum diset di Lambda validate-share.");
    if (!fileBucket) return badRequest("Environment variable FILE_BUCKET belum diset di Lambda validate-share.");

    const shareQuery = await ddb.send(new QueryCommand({
      TableName: sharesTable,
      IndexName: "token-index",
      KeyConditionExpression: "#token = :token",
      ExpressionAttributeNames: { "#token": "token" },
      ExpressionAttributeValues: { ":token": token },
      Limit: 1
    }));

    const share = shareQuery.Items?.[0];
    if (!share) return notFound("Token tidak valid.");

    const now = nowEpoch();
    const viewedAt = nowIso();

    try {
      await ddb.send(new UpdateCommand({
        TableName: sharesTable,
        Key: { shareId: share.shareId },
        UpdateExpression: "SET #status = :viewed, viewedAt = :viewedAt",
        ConditionExpression: "#status = :pending AND recipientId = :recipientId",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":viewed": "VIEWED",
          ":pending": "PENDING",
          ":recipientId": user.id,
          ":viewedAt": viewedAt
        }
      }));
    } catch (error) {
      if (share.status === "VIEWED") return conflict("File ini sudah pernah dibuka.", "ALREADY_VIEWED");
      if (share.recipientId !== user.id) return conflict("File ini bukan untuk akun kamu.", "UNAUTHORIZED");
      throw error;
    }

    const fileResult = await ddb.send(new GetCommand({
      TableName: filesTable,
      Key: { fileId: share.fileId }
    }));

    const file = fileResult.Item;
    if (!file || file.status !== "READY") return notFound("File tidak tersedia.");

    const downloadUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: fileBucket,
        Key: file.s3Key,
        ResponseContentType: file.contentType,
        ResponseContentDisposition: `inline; filename="${file.fileName.replace(/"/g, "")}"`
      }),
      { expiresIn: 3600 }
    );

    await publishNotification(
      "SecureShare: file sudah dibuka",
      `File "${share.fileName}" sudah dibuka oleh ${user.email}. Akses one-view telah dicabut.`,
      { type: "FILE_VIEWED", shareId: share.shareId, senderEmail: share.senderEmail }
    );

    console.log("SHARE_VIEWED", { shareId: share.shareId, fileId: share.fileId, recipientId: user.id });
    return ok({
      ok: true,
      downloadUrl,
      expiresInSeconds: 3600,
      share: {
        shareId: share.shareId,
        fileName: share.fileName,
        fileSize: share.fileSize,
        contentType: share.contentType,
        senderEmail: share.senderEmail,
        viewedAt
      }
    });
  } catch (error) {
    if (error.response) return handleAuthError(error);
    return serverError(error);
  }
};
