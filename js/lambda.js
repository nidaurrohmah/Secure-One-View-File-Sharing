const Lambda = {
  async validateAccess(token) {
    CloudWatch.log("LAMBDA", "INVOKE", "validateAccess triggered");
    const result = await Api.post("/shares/validate", { token });
    return {
      ok: true,
      downloadUrl: result.downloadUrl,
      expiresInSeconds: result.expiresInSeconds,
      share: {
        id: result.share.shareId,
        shareId: result.share.shareId,
        fileName: result.share.fileName,
        fileSize: result.share.fileSize,
        contentType: result.share.contentType,
        senderEmail: result.share.senderEmail,
        senderName: result.share.senderEmail,
        downloadUrl: result.downloadUrl,
        expiresInSeconds: result.expiresInSeconds,
        viewedAt: result.share.viewedAt,
        status: "viewed"
      }
    };
  },

  revokeAccess() {
    return true;
  },

  async checkExpiry() {
    return 0;
  }
};

window.Lambda = Lambda;
