import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../common/aws.mjs";
import { publishNotification } from "../common/notify.mjs";
import { ok, serverError } from "../common/http.mjs";
import { nowEpoch } from "../common/ids.mjs";

export const handler = async () => {
  console.log("EXPIRE_SCAN_DISABLED", { reason: "One-view tidak memakai batas waktu akses." });
  return ok({ ok: true, expired: 0 });
};
