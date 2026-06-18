import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "./aws.mjs";

export function publicUser(user) {
  return {
    userId: user.userId,
    id: user.userId,
    name: user.name,
    email: user.email,
    role: user.role || "user",
    avatar: user.avatar || initials(user.name)
  };
}

export function initials(name) {
  return String(name || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "U";
}

export async function findUserByEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return null;
  const tableName = process.env.USERS_TABLE || process.env.USER_TABLE;
  if (!tableName) throw new Error("Environment variable USERS_TABLE belum diset.");

  let result;
  try {
    result = await ddb.send(new QueryCommand({
      TableName: tableName,
      IndexName: "email-index",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: { ":email": normalized },
      Limit: 1
    }));
  } catch (error) {
    if (error.name !== "ValidationException") throw error;
    console.warn("email-index tidak tersedia, fallback Scan dipakai.");
    result = await ddb.send(new ScanCommand({
      TableName: tableName,
      FilterExpression: "email = :email",
      ExpressionAttributeValues: { ":email": normalized },
      Limit: 1
    }));
  }

  return result.Items?.[0] || null;
}
