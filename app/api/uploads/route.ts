import { getStoreAdmin } from "@/lib/server/admin-auth";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!(await getStoreAdmin())) return Response.json({ error: "Admin sign-in required" }, { status: 403 });

    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) return Response.json({ error: "Choose an image to upload" }, { status: 400 });
    const extension = EXTENSIONS[image.type];
    if (!extension) return Response.json({ error: "Use a JPG, PNG, WebP or AVIF image" }, { status: 415 });
    if (image.size > MAX_IMAGE_BYTES) return Response.json({ error: "Image must be smaller than 8 MB" }, { status: 413 });

    const fileName = `${crypto.randomUUID()}.${extension}`;
    const relativePath = `/uploads/products/${fileName}`;
    const targetPath = path.join(process.cwd(), "public", "uploads", "products", fileName);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, Buffer.from(await image.arrayBuffer()));

    return Response.json({ url: relativePath }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not upload image" }, { status: 500 });
  }
}
