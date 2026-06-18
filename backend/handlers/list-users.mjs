import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../common/aws.mjs";
import { getUser, handleAuthError } from "../common/auth.mjs";
import { badRequest, ok, serverError } from "../common/http.mjs";
import { publicUser } from "../common/users.mjs";

export const handler = async (event) => {
  try {
    getUser(event);
    const tableName = process.env.USERS_TABLE || process.env.USER_TABLE;
    if (!tableName) return badRequest("Environment variable USERS_TABLE belum diset di Lambda list-users.");

    const result = await ddb.send(new ScanCommand({
      TableName: tableName,
      Limit: 100
    }));
    return ok({ ok: true, users: (result.Items || []).map(publicUser) });
  } catch (error) {
    if (error.response) return handleAuthError(error);
    return serverError(error);
  }
};
