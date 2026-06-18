import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, s3 } from "../common/aws.mjs";
import { getUser, handleAuthError } from "../common/auth.mjs";
import { badRequest, forbidden, notFound, ok, parseJson, serverError } from "../common/http.mjs";
import { nowIso } from "../common/ids.mjs";

export const handler = async (event) => {
  try {
    const user = getUser(event);
    const { fileId } = parseJson(event);
    const filesTable = process.env.FILES_TABLE || process.env.FILE_TABLE;
    const fileBucket = process.env.FILE_BUCKET || process.env.S3_BUCKET;
    if (!fileId) return badRequest("fileId wajib diisi.");
    if (!filesTable) return badRequest("Environment variable FILES_TABLE belum diset di Lambda complete-upload.");
    if (!fileBucket) return badRequest("Environment variable FILE_BUCKET belum diset di Lambda complete-upload.");

    const current = await ddb.send(new GetCommand({
      TableName: filesTable,
      Key: { fileId }
    }));

    const file = current.Item;
    if (!file) return notFound("File tidak ditemukan.");
    if (file.ownerId !== user.id) return forbidden("Kamu bukan pemilik file ini.");

    await s3.send(new HeadObjectCommand({
      Bucket: fileBucket,
      Key: file.s3Key
    }));

    const updatedAt = nowIso();
    await ddb.send(new UpdateCommand({
      TableName: filesTable,
      Key: { fileId },
      UpdateExpression: "SET #status = :ready, updatedAt = :updatedAt",
      ConditionExpression: "ownerId = :ownerId",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":ready": "READY",
        ":updatedAt": updatedAt,
        ":ownerId": user.id
      }
    }));

    console.log("UPLOAD_COMPLETED", { fileId, ownerId: user.id });
    return ok({ ok: true, fileId, status: "READY" });
  } catch (error) {
    if (error.response) return handleAuthError(error);
    return serverError(error);
  }
};
