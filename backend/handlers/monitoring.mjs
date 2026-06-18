import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../common/aws.mjs";
import { getUser, handleAuthError } from "../common/auth.mjs";
import { ok, serverError } from "../common/http.mjs";

async function scanAll(tableName, limit = 500) {
  const result = await ddb.send(new ScanCommand({ TableName: tableName, Limit: limit }));
  return result.Items || [];
}

export const handler = async (event) => {
  try {
    getUser(event);
    const usersTable = process.env.USERS_TABLE || process.env.USER_TABLE;
    const filesTable = process.env.FILES_TABLE || process.env.FILE_TABLE;
    const sharesTable = process.env.SHARES_TABLE || process.env.SHARE_TABLE;
    const [users, files, shares] = await Promise.all([
      scanAll(usersTable),
      scanAll(filesTable),
      scanAll(sharesTable)
    ]);

    const byStatus = shares.reduce((acc, share) => {
      acc[share.status] = (acc[share.status] || 0) + 1;
      return acc;
    }, {});

    return ok({
      ok: true,
      services: {
        API_GATEWAY: { status: "Active", count: 1 },
        LAMBDA: { status: "Logging to CloudWatch", count: 10 },
        S3: { status: "Private", count: files.length },
        DYNAMODB: { status: "Active", count: users.length + files.length + shares.length },
        SNS: { status: "Active", count: shares.length },
        CLOUDWATCH: { status: "Active", count: "AWS Console" }
      },
      stats: {
        users: users.length,
        files: files.length,
        shares: shares.length,
        pending: byStatus.PENDING || 0,
        viewed: byStatus.VIEWED || 0,
        expired: byStatus.EXPIRED || 0
      },
      recent: shares
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, 20)
        .map((share) => ({
          timestamp: share.viewedAt || share.createdAt,
          service: "DYNAMODB",
          action: `SHARE_${share.status}`,
          message: `${share.fileName} untuk ${share.recipientEmail}`
        }))
    });
  } catch (error) {
    if (error.response) return handleAuthError(error);
    return serverError(error);
  }
};
