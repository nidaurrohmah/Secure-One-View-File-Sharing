const Api = {
  get baseUrl() {
    const cfg = window.APP_CONFIG || {};
    if (!cfg.apiBaseUrl || cfg.apiBaseUrl.includes("REPLACE_ME")) {
      throw new Error("js/config.js belum diisi dengan ApiBaseUrl hasil deploy AWS.");
    }
    return cfg.apiBaseUrl.replace(/\/$/, "");
  },

  tokenKey: "sovfs_api_token",
  userKey: "sovfs_api_user",

  setSession(token, user) {
    sessionStorage.setItem(this.tokenKey, token);
    sessionStorage.setItem(this.userKey, JSON.stringify(user));
  },

  clearSession() {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);
  },

  getToken() {
    return sessionStorage.getItem(this.tokenKey);
  },

  getUser() {
    const raw = sessionStorage.getItem(this.userKey);
    return raw ? JSON.parse(raw) : null;
  },

  async request(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
    let payload = {};
    try { payload = await res.json(); } catch {}
    if (!res.ok) {
      const detail = payload.message || payload.error || res.statusText || `HTTP ${res.status}`;
      throw new Error(`${path}: ${detail}`);
    }
    return payload;
  },

  get(path) {
    return this.request(path);
  },

  post(path, body) {
    return this.request(path, { method: "POST", body: JSON.stringify(body) });
  },

  async putFile(url, file) {
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file
    });
    if (!res.ok) throw new Error(`S3 PUT gagal (${res.status}). Cek CORS bucket dan presigned URL.`);
  }
};

window.Api = Api;
