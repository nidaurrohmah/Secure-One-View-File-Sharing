import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../common/aws.mjs";
import { getUser, handleAuthError } from "../common/auth.mjs";
import { findUserByEmail, publicUser } from "../common/users.mjs";
import { publishNotification } from "../common/notify.mjs";
import { badRequest, created, forbidden, notFound, parseJson, serverError } from "../common/http.mjs";
import { nowEpoch, nowIso, token, uuid } from "../common/ids.mjs";

export const handler = async (event) => {
  try {
    const sender = getUser(event);
    const body = parseJson(event);
    const fileId = String(body.fileId || "");
    const recipientEmail = String(body.recipientEmail || "").trim().toLowerCase();
    const recipientId = String(body.recipientId || "");
    const expiresInMinutes = Number(body.expiresInMinutes || 30);
    const usersTable = process.env.USERS_TABLE || process.env.USER_TABLE;
    const filesTable = process.env.FILES_TABLE || process.env.FILE_TABLE;
    const sharesTable = process.env.SHARES_TABLE || process.env.SHARE_TABLE;

    if (!fileId) return badRequest("fileId wajib diisi.");
    if (!recipientEmail && !recipientId) return badRequest("Email atau ID penerima wajib diisi.");
    if (!usersTable) return badRequest("Environment variable USERS_TABLE belum diset di Lambda create-share.");
    if (!filesTable) return badRequest("Environment variable FILES_TABLE belum diset di Lambda create-share.");
    if (!sharesTable) return badRequest("Environment variable SHARES_TABLE belum diset di Lambda create-share.");

    const fileResult = await ddb.send(new GetCommand({
      TableName: filesTable,
      Key: { fileId }
    }));

    const file = fileResult.Item;
    if (!file) return notFound("File tidak ditemukan.");
    if (file.ownerId !== sender.id) return forbidden("Kamu bukan pemilik file ini.");
    if (file.status !== "READY") return badRequest("File belum selesai di-upload.");

    let recipient = recipientEmail ? await findUserByEmail(recipientEmail) : null;
    if (!recipient && recipientId) {
      const userResult = await ddb.send(new GetCommand({
        TableName: usersTable,
        Key: { userId: recipientId }
      }));
      recipient = userResult.Item || null;
    }
    if (!recipient) return notFound("User penerima belum terdaftar.");
    if (recipient.userId === sender.id) return badRequest("Penerima tidak boleh sama dengan pengirim.");

    const shareId = uuid();
    const shareToken = token(32);
    const createdAt = nowIso();
    const expiresAt = nowEpoch() + 60 * 60 * 24 * 365 * 10;

    await ddb.send(new PutCommand({
      TableName: sharesTable,
      Item: {
        shareId,
        token: shareToken,
        fileId,
        fileName: file.fileName,
        fileSize: file.fileSize,
        contentType: file.contentType,
        senderId: sender.id,
        senderEmail: sender.email,
        senderName: sender.name,
        recipientId: recipient.userId,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        status: "PENDING",
        createdAt,
        expiresAt,
        ttl: expiresAt
      },
      ConditionExpression: "attribute_not_exists(shareId)"
    }));

    await publishNotification(
      "SecureShare: file baru dibagikan",
      `File "${file.fileName}" dibagikan oleh ${sender.email} untuk ${recipient.email}. Token: ${shareToken}`,
      { type: "FILE_SHARED", shareId, recipientEmail: recipient.email }
    );

    console.log("SHARE_CREATED", { shareId, fileId, senderId: sender.id, recipientId: recipient.userId });
    return created({
      ok: true,
      share: {
        shareId,
        id: shareId,
        token: shareToken,
        fileId,
        fileName: file.fileName,
        fileSize: file.fileSize,
        senderId: sender.id,
        senderEmail: sender.email,
        senderName: sender.name,
        recipientId: recipient.userId,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        status: "PENDING",
        expiresAt,
        createdAt,
        shareUrl: `view-file.html?token=${shareToken}`
      },
      recipient: publicUser(recipient)
    });
  } catch (error) {
    if (error.response) return handleAuthError(error);
    return serverError(error);
  }
};
