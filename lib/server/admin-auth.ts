import { getChatGPTUser } from "@/app/chatgpt-auth";

const ADMIN_EMAIL_HASH = "13bbf22c60df279fe7b07e70ea108f80e79121818118e8877cf67cade1328222";

export async function getStoreAdmin() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const bytes = new TextEncoder().encode(user.email.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return hash === ADMIN_EMAIL_HASH ? user : null;
}
