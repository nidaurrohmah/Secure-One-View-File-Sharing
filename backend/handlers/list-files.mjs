import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../common/aws.mjs";
import { getUser, handleAuthError } from "../common/auth.mjs";
import { badRequest, ok, serverError } from "../common/http.mjs";

export const handler = async (event) => {
  try {
    const user = getUser(event);
    const filesTable = process.env.FILES_TABLE || process.env.FILE_TABLE;
    if (!filesTable) return badRequest("Environment variable FILES_TABLE belum diset di Lambda list-files.");

    let result;
    try {
      result = await ddb.send(new QueryCommand({
        TableName: filesTable,
        IndexName: "owner-index",
        KeyConditionExpression: "ownerId = :ownerId",
        ExpressionAttributeValues: { ":ownerId": user.id },
        ScanIndexForward: false,
        Limit: 50
      }));
    } catch (error) {
      if (error.name !== "ValidationException") throw error;
      console.warn("owner-index tidak tersedia, fallback Scan dipakai.");
      result = await ddb.send(new ScanCommand({
        TableName: filesTable,
        FilterExpression: "ownerId = :ownerId",
        ExpressionAttributeValues: { ":ownerId": user.id },
        Limit: 50
      }));
    }

    return ok({
      ok: true,
      files: (result.Items || []).map((file) => ({
        fileId: file.fileId,
        fileName: file.fileName,
        fileSize: file.fileSize,
        contentType: file.contentType,
        status: file.status,
        createdAt: file.createdAt
      }))
    });
  } catch (error) {
    if (error.response) return handleAuthError(error);
    return serverError(error);
  }
};
