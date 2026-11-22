import initial from "@/data/initial.json";
import { packSchema, type Pack } from "./schema";

import { readerToken } from "./reader-link";
const readerStorage = "trading-plan-reader-v1";
let activeReader = "";
function stored(name: string) {
  try {
    return localStorage.getItem(name) || "";
  } catch {
    return "";
  }
}
function remember(name: string, value: string) {
  try {
    localStorage.setItem(name, value);
    history.replaceState(
      history.state,
      "",
      location.pathname + location.search,
    );
  } catch {
    /* Keep the fragment available for reload when storage is blocked. */
  }
}
export async function overviewPath() {
  if (String(initial.format) === "trading-plan-source-v1") return "/plan/local";
  const hash = new URLSearchParams(location.hash.slice(1));
  const legacy = hash.get("plan");
  const key = legacy || stored(storageKey);
  const reader = legacy
    ? await readerToken(legacy)
    : hash.get("reader") ||
      activeReader ||
      stored(readerStorage) ||
      (key ? await readerToken(key) : "");
  return /^[a-f0-9]{64}$/.test(reader) ? "/plan/" + reader : "";
}
const storageKey = "trading-plan-access-v1";
const bytes = (value: string) =>
  Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
let loaded: Promise<Pack> | undefined;

async function openSource(): Promise<Pack> {
  const source: unknown = initial;
  if (
    source &&
    typeof source === "object" &&
    "format" in source &&
    source.format === "trading-plan-source-v1"
  )
    return packSchema.parse(source);
  if (
    !source ||
    typeof source !== "object" ||
    !("iv" in source) ||
    !("ciphertext" in source) ||
    typeof source.iv !== "string" ||
    typeof source.ciphertext !== "string"
  )
    throw Error("This release has no bundled trading plan.");
  const hash = new URLSearchParams(location.hash.slice(1));
  const fromLink = hash.get("plan");
  const reader =
    hash.get("reader") ||
    (!fromLink && !stored(storageKey) ? stored(readerStorage) : "");
  if (reader) {
    const response = await fetch("/api/workbook", {
      headers: { Authorization: "Bearer " + reader },
      cache: "no-store",
    });
    if (!response.ok)
      throw Error("Open the full private plan link to access this workbook.");
    const pack = packSchema.parse(await response.json());
    activeReader = reader;
    if (hash.has("reader")) remember(readerStorage, reader);
    return pack;
  }
  const access = fromLink || stored(storageKey);
  if (!access)
    throw Error(
      "Open your private Trading Plan link to view the workbook on this device.",
    );
  let decoded: ArrayBuffer;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      bytes(access),
      "AES-GCM",
      false,
      ["decrypt"],
    );
    decoded = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes(source.iv) },
      key,
      bytes(source.ciphertext),
    );
  } catch {
    throw Error(
      "This link could not unlock the trading plan. Open the full private link.",
    );
  }
  const plan = packSchema.parse(JSON.parse(new TextDecoder().decode(decoded)));
  activeReader = await readerToken(access);
  if (fromLink) remember(storageKey, access);
  return plan;
}
export function loadPlan() {
  return (loaded ??= openSource().catch((e) => {
    loaded = undefined;
    throw e;
  }));
}
