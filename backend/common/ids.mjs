import crypto from "node:crypto";

export function uuid() {
  return crypto.randomUUID();
}

export function token(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function nowIso() {
  return new Date().toISOString();
}

export function nowEpoch() {
  return Math.floor(Date.now() / 1000);
}

export function safeFileName(name) {
  return String(name || "file")
    .replace(/[^\w.\- ()]/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 160);
}
