// Separate the shareable reader capability from the original workbook encryption key.
export const readerScope = "trading-plan-reader-v1:";
export async function readerToken(key: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(readerScope + key),
  );
  return Array.from(new Uint8Array(digest), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
