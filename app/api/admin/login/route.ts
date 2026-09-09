import { ADMIN_COOKIE_NAME, ADMIN_SESSION_VALUE } from "@/lib/server/admin-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (username !== "imad" || password !== "imad") {
    redirect("/admin?error=1");
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, ADMIN_SESSION_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/admin");
}
