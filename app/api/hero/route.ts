import { env } from "cloudflare:workers";
import { getStoreAdmin } from "@/lib/server/admin-auth";

const SETTINGS_KEY = "settings/hero.json";
const DEFAULT_VIDEO_URL = "/video/otherlife-hero-2026.mp4";
const CUSTOM_VIDEO_RESET_AT = Date.parse("2026-09-03T21:31:06Z");
const MAX_VIDEO_BYTES = 40 * 1024 * 1024;
const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};

type HeroSettings = {
  videoUrl: string;
  fileName: string;
  updatedAt: string;
};

export async function GET() {
  try {
    const saved = await env.BUCKET.get(SETTINGS_KEY);
    if (!saved) {
      return Response.json({ videoUrl: DEFAULT_VIDEO_URL, fileName: "Current campaign video", custom: false }, {
        headers: { "cache-control": "no-store" },
      });
    }

    const settings = JSON.parse(await saved.text()) as HeroSettings;
    if (!settings.updatedAt || Date.parse(settings.updatedAt) <= CUSTOM_VIDEO_RESET_AT) {
      return Response.json({ videoUrl: DEFAULT_VIDEO_URL, fileName: "Streetwear campaign video", custom: false }, {
        headers: { "cache-control": "no-store" },
      });
    }
    return Response.json({ ...settings, custom: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load hero video" }, { status: 500 });
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
    if (video.size > MAX_VIDEO_BYTES) return Response.json({ error: "Video must be smaller than 40 MB" }, { status: 413 });

    const key = `hero/${crypto.randomUUID()}.${extension}`;
    await env.BUCKET.put(key, video.stream(), {
      httpMetadata: { contentType: video.type, cacheControl: "public, max-age=31536000, immutable" },
    });

    const settings: HeroSettings = {
      videoUrl: `/api/media?key=${encodeURIComponent(key)}`,
      fileName: video.name,
      updatedAt: new Date().toISOString(),
    };
    await env.BUCKET.put(SETTINGS_KEY, JSON.stringify(settings), {
      httpMetadata: { contentType: "application/json", cacheControl: "no-store" },
    });

    return Response.json({ ...settings, custom: true }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not upload hero video" }, { status: 500 });
  }
}
