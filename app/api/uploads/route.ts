import { env } from "cloudflare:workers";
import { getStoreAdmin } from "@/lib/server/admin-auth";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function POST(request: Request) {
  try {
    if (!(await getStoreAdmin())) return Response.json({ error: "Admin sign-in required" }, { status: 403 });

    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) return Response.json({ error: "Choose an image to upload" }, { status: 400 });
    const extension = EXTENSIONS[image.type];
    if (!extension) return Response.json({ error: "Use a JPG, PNG, WebP or AVIF image" }, { status: 415 });
    if (image.size > MAX_IMAGE_BYTES) return Response.json({ error: "Image must be smaller than 8 MB" }, { status: 413 });

    const key = `products/${crypto.randomUUID()}.${extension}`;
    await env.BUCKET.put(key, await image.arrayBuffer(), {
      httpMetadata: { contentType: image.type },
    });

    return Response.json({ url: `/api/media?key=${encodeURIComponent(key)}` }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not upload image" }, { status: 500 });
  }
}
