// SPDX-License-Identifier: MIT

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminList, AdminLogin } from "../../../components/next/Admin";
import { adminConfigured, SESSION_COOKIE, sessionEmail } from "../../../lib/admin-auth";
import { listApplications } from "../../../lib/applications";
import "../next.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Beta applications — IcpFinder" },
  robots: { index: false },
};

export default async function AdminPage() {
  const email = sessionEmail((await cookies()).get(SESSION_COOKIE)?.value);
  return (
    <div className="nx nx-admin">
      <header className="nx-nav">
        <a href="/next" className="nx-brand">
          IcpFinder <span className="nx-muted">· beta admin</span>
        </a>
        {email && <span className="nx-muted">{email}</span>}
      </header>
      <main>
        {!adminConfigured() ? (
          <p className="nx-glass nx-apply">
            Set ADMIN_EMAILS and ADMIN_SECRET (32+ characters) to use this page.
          </p>
        ) : email ? (
          <AdminList rows={await listApplications()} />
        ) : (
          <AdminLogin />
        )}
      </main>
    </div>
  );
}
