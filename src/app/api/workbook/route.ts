import { readWorkbook } from "@/lib/reader-server";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const pack = auth?.startsWith("Bearer ") ? readWorkbook(auth.slice(7)) : null;
  return Response.json(pack ?? { error: "Invalid plan link." }, {
    status: pack ? 200 : 404,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
