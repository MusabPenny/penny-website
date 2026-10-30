import type { Metadata } from "next";
import "./admin.css";
import "./admin-lists.css";

export const metadata: Metadata = {
  title: { default: "Administracija | PennyPlus", template: "%s | PennyPlus administracija" },
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-root">{children}</div>;
}
