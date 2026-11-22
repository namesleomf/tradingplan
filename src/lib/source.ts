import initial from "@/data/initial.json";
import { packSchema, type Pack } from "./schema";

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
  const fromLink = new URLSearchParams(location.hash.slice(1)).get("plan");
  const access = fromLink || localStorage.getItem(storageKey);
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
  if (fromLink) {
    localStorage.setItem(storageKey, access);
    history.replaceState(
      history.state,
      "",
      location.pathname + location.search,
    );
  }
  return plan;
}
export function loadPlan() {
  return (loaded ??= openSource().catch((e) => {
    loaded = undefined;
    throw e;
  }));
}
