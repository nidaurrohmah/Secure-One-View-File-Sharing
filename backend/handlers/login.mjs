import { createToken } from "../common/auth.mjs";
import { badRequest, ok, parseJson, serverError } from "../common/http.mjs";
import { verifyPassword } from "../common/password.mjs";
import { findUserByEmail, publicUser } from "../common/users.mjs";

export const handler = async (event) => {
  try {
    const body = parseJson(event);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!process.env.AUTH_SECRET) {
      return badRequest("Environment variable AUTH_SECRET belum diset di Lambda login.");
    }
    const user = await findUserByEmail(email);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return badRequest("Email atau password salah.");
    }

    console.log("AUTH_LOGIN", { userId: user.userId, email });
    return ok({ ok: true, user: publicUser(user), token: createToken(user) });
  } catch (error) {
    return serverError(error);
  }
};
