import { env } from "cloudflare:workers";

export async function GET(request: Request) {
  try {
    const key = new URL(request.url).searchParams.get("key") ?? "";
    if ((!key.startsWith("products/") && !key.startsWith("hero/")) || key.includes("..")) {
      return Response.json({ error: "Invalid media key" }, { status: 400 });
    }

    const rangeRequested = request.headers.has("range");
    const image = await env.BUCKET.get(key, rangeRequested ? { range: request.headers } : undefined);
    if (!image || !("body" in image)) return Response.json({ error: "Media not found" }, { status: 404 });

    const headers = new Headers();
    image.writeHttpMetadata(headers);
    headers.set("etag", image.httpEtag);
    headers.set("accept-ranges", "bytes");
    headers.set("cache-control", "public, max-age=31536000, immutable");
    if (image.range) {
      const offset = image.range.offset ?? 0;
      const length = image.range.length ?? image.size;
      headers.set("content-range", `bytes ${offset}-${offset + length - 1}/${image.size}`);
      headers.set("content-length", String(length));
      return new Response(image.body, { status: 206, headers });
    }

    headers.set("content-length", String(image.size));
    return new Response(image.body, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load media" }, { status: 500 });
  }
}
