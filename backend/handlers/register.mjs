import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../common/aws.mjs";
import { createToken } from "../common/auth.mjs";
import { badRequest, created, parseJson, serverError } from "../common/http.mjs";
import { nowIso, uuid } from "../common/ids.mjs";
import { hashPassword } from "../common/password.mjs";
import { findUserByEmail, initials, publicUser } from "../common/users.mjs";

export const handler = async (event) => {
  try {
    const body = parseJson(event);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!name) return badRequest("Nama wajib diisi.");
    if (!email.includes("@")) return badRequest("Email tidak valid.");
    if (password.length < 8) return badRequest("Password minimal 8 karakter.");
    if (await findUserByEmail(email)) return badRequest("Email sudah terdaftar.");

    const user = {
      userId: uuid(),
      name,
      email,
      passwordHash: hashPassword(password),
      role: "user",
      avatar: initials(name),
      createdAt: nowIso()
    };

    await ddb.send(new PutCommand({
      TableName: process.env.USERS_TABLE,
      Item: user,
      ConditionExpression: "attribute_not_exists(userId)"
    }));

    const safeUser = publicUser(user);
    console.log("AUTH_REGISTER", { userId: user.userId, email });
    return created({ ok: true, user: safeUser, token: createToken(user) });
  } catch (error) {
    return serverError(error);
  }
};
