const Storage = {
  filesCache: [],

  normalize(file) {
    return {
      id: file.fileId || file.id,
      fileId: file.fileId || file.id,
      name: file.fileName || file.name,
      fileName: file.fileName || file.name,
      size: file.fileSize || file.size || 0,
      fileSize: file.fileSize || file.size || 0,
      type: file.contentType || file.type || "application/octet-stream",
      contentType: file.contentType || file.type || "application/octet-stream",
      status: file.status,
      s3Key: file.s3Key,
      uploadedAt: file.createdAt,
      createdAt: file.createdAt
    };
  },

  async refresh() {
    const result = await Api.get("/files");
    this.filesCache = (result.files || []).map((file) => this.normalize(file));
    return this.filesCache;
  },

  getAll() {
    return this.filesCache;
  },

  getById(id) {
    return this.filesCache.find((file) => file.id === id || file.fileId === id) || null;
  },

  getByOwner() {
    return this.filesCache;
  },

  async upload(file) {
    let upload;
    try {
      upload = await Api.post("/files/upload-url", {
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || "application/octet-stream"
      });
    } catch (error) {
      throw new Error(`Gagal membuat presigned URL: ${error.message}`);
    }

    try {
      await Api.putFile(upload.uploadUrl, file);
    } catch (error) {
      throw new Error(`Gagal upload ke S3: ${error.message}`);
    }

    try {
      await Api.post("/files/complete", { fileId: upload.fileId });
    } catch (error) {
      throw new Error(`Gagal menyelesaikan upload: ${error.message}`);
    }

    await this.refresh().catch(() => null);
    const saved = this.getById(upload.fileId);
    if (saved) return { ...saved, s3Key: upload.s3Key };
    return this.normalize({ fileId: upload.fileId, fileName: file.name, fileSize: file.size, contentType: file.type, status: "READY", s3Key: upload.s3Key });
  }
};

window.Storage = Storage;
