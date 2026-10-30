import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { logout } from "@/app/admin/actions";
import { permits, type AppUser, type Permission } from "@/lib/admin/policy";

const links: { href: string; name: string; permission: Permission }[] = [
  { href: "/admin/newsletter", name: "Newsletter", permission: "content.manage" },
  { href: "/admin/oglasi", name: "Oglasi za posao", permission: "jobs.manage" },
  { href: "/admin/prijave", name: "Prijave kandidata", permission: "applications.manage" },
  { href: "/admin/obavijesti", name: "E-mail obavijesti", permission: "applications.manage" },
  { href: "/admin/sadrzaj", name: "Novosti i marketing", permission: "content.manage" },
  { href: "/admin/imenik", name: "Lokacije i naš tim", permission: "directory.manage" },
  { href: "/admin", name: "Pregled", permission: "dashboard.read" },
  { href: "/admin/korisnici", name: "Korisnici", permission: "users.read" },
  { href: "/admin/uloge", name: "Uloge i dozvole", permission: "roles.read" },
  { href: "/admin/audit", name: "Audit log", permission: "audit.read" },
];
export function AdminShell({ user, children }: { user: AppUser; children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-brand">
          <Image src="/penny.png" alt="PennyPlus" width={52} height={52} />
          <span>
            PennyPlus<small>Administracija</small>
          </span>
        </Link>
        <p className="admin-eyebrow">RADNI PROSTOR</p>
        <nav aria-label="Administratorska navigacija">
          {links
            .filter((link) => permits(user, link.permission))
            .map((link) => (
              <Link href={link.href} key={link.href}>
                {link.name}
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link href="/">← Javna stranica</Link>
          <p>
            Pristup poslovnim računom.
            <br />
            Promjene se evidentiraju.
          </p>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <span>
            Interni portal <span className="admin-online">●</span>
          </span>
          <div>
            <ThemeToggle />
            <span className="admin-user-name">{user.display_name}</span>
            <form action={logout}>
              <button className="admin-button secondary">Odjava</button>
            </form>
          </div>
        </header>
        <main id="sadrzaj" className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
