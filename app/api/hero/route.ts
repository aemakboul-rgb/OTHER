import { getStoreAdmin } from "@/lib/server/admin-auth";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_VIDEO_URL = "/video/otherlife-hero-2026.mp4";
const settingsPath = path.join(process.cwd(), "data", "hero.json");
const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};

type HeroSettings = {
  videoUrl: string;
  fileName: string;
  updatedAt: string;
};

export const runtime = "nodejs";

export async function GET() {
  try {
    const settings = JSON.parse(await readFile(settingsPath, "utf8")) as HeroSettings;
    if (settings.videoUrl.startsWith("/uploads/")) {
      const key = settings.videoUrl.replace("/uploads/", "");
      settings.videoUrl = `/api/media?key=${encodeURIComponent(key)}`;
    }
    return Response.json({ ...settings, custom: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json(
      { videoUrl: DEFAULT_VIDEO_URL, fileName: "Current campaign video", custom: false },
      { headers: { "cache-control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await getStoreAdmin())) return Response.json({ error: "Admin sign-in required" }, { status: 403 });

    const formData = await request.formData();
    const video = formData.get("video");
    if (!(video instanceof File)) return Response.json({ error: "Choose a video to upload" }, { status: 400 });

    const extension = VIDEO_EXTENSIONS[video.type];
    if (!extension) return Response.json({ error: "Use an MP4 or WebM video" }, { status: 415 });
    const fileName = `${crypto.randomUUID()}.${extension}`;
    const key = `hero/${fileName}`;
    const videoUrl = `/api/media?key=${encodeURIComponent(key)}`;
    const targetPath = path.join(process.cwd(), "public", "uploads", "hero", fileName);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, Buffer.from(await video.arrayBuffer()));

    const settings: HeroSettings = {
      videoUrl,
      fileName: video.name,
      updatedAt: new Date().toISOString(),
    };
    await mkdir(path.dirname(settingsPath), { recursive: true });
    await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");

    return Response.json({ ...settings, custom: true }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not upload hero video" }, { status: 500 });
  }
}
