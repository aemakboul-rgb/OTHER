import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "otherlife_admin";
export const ADMIN_SESSION_VALUE = "imad";

export async function getStoreAdmin() {
  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_COOKIE_NAME)?.value !== ADMIN_SESSION_VALUE) return null;
  return { email: "imad@otherlife.local", displayName: "imad" };
}
