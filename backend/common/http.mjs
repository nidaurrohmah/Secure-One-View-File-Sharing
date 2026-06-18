const defaultHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

export function json(statusCode, body) {
  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(body)
  };
}

export function ok(body) {
  return json(200, body);
}

export function created(body) {
  return json(201, body);
}

export function badRequest(message, details = undefined) {
  return json(400, { ok: false, error: "BAD_REQUEST", message, details });
}

export function forbidden(message = "Akses ditolak.") {
  return json(403, { ok: false, error: "FORBIDDEN", message });
}

export function notFound(message = "Data tidak ditemukan.") {
  return json(404, { ok: false, error: "NOT_FOUND", message });
}

export function conflict(message, reason = "CONFLICT") {
  return json(409, { ok: false, error: reason, message });
}

export function serverError(error) {
  console.error(error);
  return json(500, {
    ok: false,
    error: "SERVER_ERROR",
    message: error?.message || "Terjadi kesalahan server.",
    name: error?.name
  });
}

export function parseJson(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    throw new Error("Body request harus JSON valid.");
  }
}
