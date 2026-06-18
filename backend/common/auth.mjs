import crypto from "node:crypto";
import { forbidden } from "./http.mjs";

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function sign(value) {
  return b64url(crypto.createHmac("sha256", process.env.AUTH_SECRET).update(value).digest());
}

export function createToken(user) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    sub: user.userId,
    email: user.email,
    name: user.name,
    role: user.role || "user",
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12
  }));
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${sign(unsigned)}`;
}

export function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const unsigned = `${parts[0]}.${parts[1]}`;
  const expected = sign(unsigned);
  const actualBuffer = Buffer.from(parts[2]);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  const claims = JSON.parse(fromB64url(parts[1]));
  if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) return null;
  return claims;
}

export function getUser(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const claims = verifyToken(token);
  if (!claims?.sub) {
    throw Object.assign(new Error("Token tidak valid atau tidak ada."), {
      response: forbidden("Silakan login ulang.")
    });
  }

  return {
    id: claims.sub,
    email: claims.email || "",
    name: claims.name || claims.email || claims.sub,
    role: claims.role || "user"
  };
}

export function handleAuthError(error) {
  return error?.response || forbidden("Silakan login ulang.");
}
