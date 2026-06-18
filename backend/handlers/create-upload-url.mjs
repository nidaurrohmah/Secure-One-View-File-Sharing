import { PutObjectCommand } from "@aws-sdk/client-s3";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ddb, s3 } from "../common/aws.mjs";
import { getUser, handleAuthError } from "../common/auth.mjs";
import { badRequest, created, parseJson, serverError } from "../common/http.mjs";
import { nowEpoch, nowIso, safeFileName, uuid } from "../common/ids.mjs";

const maxFileSize = Number(process.env.MAX_FILE_SIZE_BYTES || 10485760);

export const handler = async (event) => {
  try {
    const user = getUser(event);
    const body = parseJson(event);
    const fileName = safeFileName(body.fileName);
    const contentType = String(body.contentType || "application/octet-stream");
    const fileSize = Number(body.fileSize || 0);
    const filesTable = process.env.FILES_TABLE || process.env.FILE_TABLE;
    const fileBucket = process.env.FILE_BUCKET || process.env.S3_BUCKET;

    if (!fileName) return badRequest("Nama file wajib diisi.");
    if (!Number.isFinite(fileSize) || fileSize <= 0) return badRequest("Ukuran file tidak valid.");
    if (fileSize > maxFileSize) return badRequest(`Ukuran file melebihi batas ${maxFileSize} bytes.`);
    if (!filesTable) return badRequest("Environment variable FILES_TABLE belum diset di Lambda create-upload-url.");
    if (!fileBucket) return badRequest("Environment variable FILE_BUCKET belum diset di Lambda create-upload-url.");

    const fileId = uuid();
    const createdAt = nowIso();
    const s3Key = `users/${user.id}/${fileId}/${fileName}`;

    await ddb.send(new PutCommand({
      TableName: filesTable,
      Item: {
        fileId,
        ownerId: user.id,
        ownerEmail: user.email,
        s3Key,
        fileName,
        fileSize,
        contentType,
        status: "UPLOADING",
        createdAt,
        updatedAt: createdAt,
        ttl: nowEpoch() + 60 * 60 * 24 * 30
      },
      ConditionExpression: "attribute_not_exists(fileId)"
    }));

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: fileBucket,
        Key: s3Key,
        ContentType: contentType,
        Metadata: {
          fileId,
          ownerId: user.id
        }
      }),
      { expiresIn: 300 }
    );

    console.log("UPLOAD_URL_CREATED", { fileId, ownerId: user.id, fileSize });
    return created({ ok: true, fileId, uploadUrl, s3Key, expiresInSeconds: 300 });
  } catch (error) {
    if (error.response) return handleAuthError(error);
    return serverError(error);
  }
};
