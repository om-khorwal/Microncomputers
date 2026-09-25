import Link from "next/link";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/import", label: "Import Sheet" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-navy sm:block">
        <div className="px-5 py-5 text-sm font-bold text-white">Micron Admin</div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 px-3">
          <Link href="/" className="block rounded-md px-3 py-2 text-xs font-medium text-white/50 hover:text-white">
            ← Back to site
          </Link>
        </div>
      </aside>

      <div className="flex-1 bg-[#f8f9fb]">
        <header className="flex items-center justify-between border-b border-border bg-white px-6 py-3 sm:hidden">
          <span className="text-sm font-bold text-navy">Micron Admin</span>
          <nav className="flex gap-3 text-xs font-medium text-muted">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-accent">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
