import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const key = new URL(request.url).searchParams.get("key") ?? "";
    if ((!key.startsWith("products/") && !key.startsWith("hero/")) || key.includes("..")) {
      return Response.json({ error: "Invalid media key" }, { status: 400 });
    }

    const targetPath = path.join(process.cwd(), "public", "uploads", key);
    const fileStat = await stat(targetPath);
    const contentType = CONTENT_TYPES[path.extname(targetPath).toLowerCase()] ?? "application/octet-stream";
    const range = request.headers.get("range");

    if (range) {
      const match = range.match(/bytes=(\d+)-(\d*)/);
      const start = match ? Number(match[1]) : 0;
      const end = match?.[2] ? Number(match[2]) : fileStat.size - 1;
      const length = end - start + 1;
      return new Response(Readable.toWeb(createReadStream(targetPath, { start, end })) as ReadableStream, {
        status: 206,
        headers: {
          "accept-ranges": "bytes",
          "cache-control": "public, max-age=31536000, immutable",
          "content-length": String(length),
          "content-range": `bytes ${start}-${end}/${fileStat.size}`,
          "content-type": contentType,
        },
      });
    }

    return new Response(Readable.toWeb(createReadStream(targetPath)) as ReadableStream, {
      headers: {
        "accept-ranges": "bytes",
        "cache-control": "public, max-age=31536000, immutable",
        "content-length": String(fileStat.size),
        "content-type": contentType,
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Media not found" }, { status: 404 });
  }
}
