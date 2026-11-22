import "server-only";
import { createHash, createDecipheriv, timingSafeEqual } from "node:crypto";
import initial from "@/data/initial.json";
import { packSchema, type Pack } from "./schema";
import { readerScope } from "./reader-link";
let workbook: Pack | undefined;

export function readWorkbook(access: string): Pack | null {
  const source = initial as {
    format: string;
    iv?: string;
    ciphertext?: string;
  };
  if (source.format === "trading-plan-source-v1")
    return access === "local" ? (workbook ??= packSchema.parse(source)) : null;
  const key = process.env.TRADING_PLAN_SOURCE_KEY;
  if (
    !key ||
    !source.iv ||
    !source.ciphertext ||
    !/^[a-f0-9]{64}$/.test(access)
  )
    return null;
  const expected = createHash("sha256")
    .update(readerScope + key)
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(access, "hex"))) return null;
  if (workbook) return workbook;
  const encrypted = Buffer.from(source.ciphertext, "base64url");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "base64url"),
    Buffer.from(source.iv, "base64url"),
  );
  decipher.setAuthTag(encrypted.subarray(-16));
  const text = Buffer.concat([
    decipher.update(encrypted.subarray(0, -16)),
    decipher.final(),
  ]).toString("utf8");
  return (workbook = packSchema.parse(JSON.parse(text)));
}
