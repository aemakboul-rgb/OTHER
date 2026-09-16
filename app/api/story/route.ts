import { getStoreAdmin } from "@/lib/server/admin-auth";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_IMAGE_URL = "/images/products/otherlife-night-coach-jacket.webp";
const settingsPath = path.join(process.cwd(), "data", "story.json");
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

type StorySettings = {
  imageUrl: string;
  fileName: string;
  updatedAt: string;
};

export const runtime = "nodejs";

export async function GET() {
  try {
    const settings = JSON.parse(await readFile(settingsPath, "utf8")) as StorySettings;
    if (settings.imageUrl.startsWith("/uploads/")) {
      const key = settings.imageUrl.replace("/uploads/", "");
      settings.imageUrl = `/api/media?key=${encodeURIComponent(key)}`;
    }
    return Response.json({ ...settings, custom: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json(
      { imageUrl: DEFAULT_IMAGE_URL, fileName: "Current story image", custom: false },
      { headers: { "cache-control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await getStoreAdmin())) return Response.json({ error: "Admin sign-in required" }, { status: 403 });

    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) return Response.json({ error: "Choose an image to upload" }, { status: 400 });

    const extension = IMAGE_EXTENSIONS[image.type];
    if (!extension) return Response.json({ error: "Use a JPG, PNG, WebP or AVIF image" }, { status: 415 });

    const storedName = `${crypto.randomUUID()}.${extension}`;
    const key = `story/${storedName}`;
    const imageUrl = `/api/media?key=${encodeURIComponent(key)}`;
    const targetPath = path.join(process.cwd(), "public", "uploads", "story", storedName);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, Buffer.from(await image.arrayBuffer()));

    const settings: StorySettings = { imageUrl, fileName: image.name, updatedAt: new Date().toISOString() };
    await mkdir(path.dirname(settingsPath), { recursive: true });
    await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");

    return Response.json({ ...settings, custom: true }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not upload story image" }, { status: 500 });
  }
}
