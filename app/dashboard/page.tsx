import { chatGPTSignOutPath, requireChatGPTUser } from "@/app/chatgpt-auth";
import AnimatedBrandLogo from "@/components/animated-brand-logo";
import { getStoreAdmin } from "@/lib/server/admin-auth";
import Link from "next/link";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const signedInUser = await requireChatGPTUser("/dashboard");
  const admin = await getStoreAdmin();

  if (!admin) {
    return (
      <main className="admin-login-page">
        <Link className="admin-login-logo" href="/" aria-label="OTHERLIFE storefront"><AnimatedBrandLogo /></Link>
        <section className="admin-login-card">
          <span>OTHERLIFE CONTROL</span>
          <h1>Access protected</h1>
          <p>{signedInUser.email} is signed in, but this dashboard is reserved for the store owner.</p>
          <Link className="admin-auth-action" href={chatGPTSignOutPath("/dashboard")} target="_top">Switch account →</Link>
          <Link href="/">← Back to storefront</Link>
        </section>
      </main>
    );
  }

  return <DashboardClient displayName={admin.displayName} signOutHref={chatGPTSignOutPath("/")} />;
}
