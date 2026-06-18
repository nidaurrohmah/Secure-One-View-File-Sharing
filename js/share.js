const Share = {
  sentCache: [],
  receivedCache: [],

  normalize(share) {
    const status = String(share.status || "").toLowerCase();
    return {
      id: share.shareId || share.id,
      shareId: share.shareId || share.id,
      token: share.token,
      fileId: share.fileId,
      fileName: share.fileName,
      fileSize: share.fileSize || 0,
      senderId: share.senderId,
      senderEmail: share.senderEmail,
      senderName: share.senderName || share.senderEmail,
      recipientId: share.recipientId,
      recipientEmail: share.recipientEmail,
      recipientName: share.recipientName || share.recipientEmail,
      status,
      createdAt: share.createdAt,
      expiresAt: typeof share.expiresAt === "number" ? new Date(share.expiresAt * 1000).toISOString() : share.expiresAt,
      viewedAt: share.viewedAt,
      shareUrl: share.shareUrl || `view-file.html?token=${share.token}`
    };
  },

  async refresh() {
    const result = await Api.get("/shares");
    this.sentCache = (result.sent || []).map((share) => this.normalize(share));
    this.receivedCache = (result.received || []).map((share) => this.normalize(share));
    return { sent: this.sentCache, received: this.receivedCache };
  },

  async create(fileId, senderId, recipientId, expiresInMinutes = 60) {
    try {
      const result = await Api.post("/shares", { fileId, recipientId, expiresInMinutes });
      await this.refresh();
      return { ok: true, share: this.normalize(result.share) };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },

  async createByEmail(fileId, recipientEmail, expiresInMinutes = 60) {
    try {
      const result = await Api.post("/shares", { fileId, recipientEmail, expiresInMinutes });
      await this.refresh().catch(() => null);
      return { ok: true, share: this.normalize(result.share) };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },

  getBySender() {
    return this.sentCache;
  },

  getByRecipient() {
    return this.receivedCache;
  },

  getById(id) {
    return [...this.sentCache, ...this.receivedCache].find((share) => share.id === id || share.shareId === id) || null;
  },

  getByToken(token) {
    return [...this.sentCache, ...this.receivedCache].find((share) => share.token === token) || null;
  },

  updateStatus() {
    return true;
  },

  getStats() {
    const all = [...this.sentCache, ...this.receivedCache];
    return {
      totalSent: this.sentCache.length,
      totalReceived: this.receivedCache.length,
      pending: all.filter((s) => s.status === "pending").length,
      viewed: all.filter((s) => s.status === "viewed").length,
      expired: all.filter((s) => s.status === "expired").length
    };
  },

  getGlobalStats() {
    const all = [...this.sentCache, ...this.receivedCache];
    return {
      total: all.length,
      pending: all.filter((s) => s.status === "pending").length,
      viewed: all.filter((s) => s.status === "viewed").length,
      expired: all.filter((s) => s.status === "expired").length
    };
  }
};

window.Share = Share;
