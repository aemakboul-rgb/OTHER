import AnimatedBrandLogo from "@/components/animated-brand-logo";
import { getStoreAdmin } from "@/lib/server/admin-auth";
import Link from "next/link";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const admin = await getStoreAdmin();

  if (!admin) {
    return (
      <main className="admin-login-page">
        <Link className="admin-login-logo" href="/" aria-label="OTHERLIFE storefront">
          <AnimatedBrandLogo />
        </Link>
        <section className="admin-login-card">
          <span>OTHERLIFE CONTROL</span>
          <h1>Admin sign in</h1>
          <p>Manage products, stock, orders and storefront media.</p>
          <form className="admin-login-form" action="/api/admin/login" method="post">
            <label>
              Username
              <input name="username" autoComplete="username" required />
            </label>
            <label>
              Password
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            {params?.error && <p className="admin-login-error">Username or password is incorrect.</p>}
            <button className="admin-auth-action" type="submit">Sign in</button>
          </form>
          <Link href="/">Back to storefront</Link>
        </section>
      </main>
    );
  }

  return <DashboardClient displayName={admin.displayName} signOutHref="/api/admin/logout" />;
}
