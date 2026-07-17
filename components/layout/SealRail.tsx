
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useWalletContext } from "@/contexts/WalletContext";
import { veilpactRead } from "@/lib/genlayer/contract";
import {
  LayoutDashboard, FilePlus2, FolderKanban, Fingerprint,
  Swords, Package, ScanEye, FlaskConical, BookLock, Settings, ShieldCheck,
} from "lucide-react";

const NAV = [
  { href: "/overview",           label: "Overview",       icon: LayoutDashboard },
  { href: "/new-pact",           label: "New Pact",       icon: FilePlus2 },
  { href: "/pacts",              label: "My Pacts",       icon: FolderKanban },
  { href: "/commitments",        label: "Commitments",    icon: Fingerprint },
  { href: "/disputes",           label: "Disputes",       icon: Swords },
  { href: "/evidence",           label: "Evidence Room",  icon: Package },
  { href: "/reveal",             label: "Reveal Console", icon: ScanEye },
  { href: "/review",             label: "GL Review",      icon: FlaskConical },
  { href: "/privacy-ledger",     label: "Privacy Ledger", icon: BookLock },
  { href: "/settings",           label: "Settings",       icon: Settings },
];

export function SealRail() {
  const path = usePathname();
  const { address, connected } = useWalletContext();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!connected || !address) { setIsAdmin(false); return; }
    let cancelled = false;
    void veilpactRead.getAdmin().then(admin => {
      if (!cancelled) setIsAdmin(String(admin).toLowerCase() === address.toLowerCase());
    }).catch(() => { if (!cancelled) setIsAdmin(false); });
    return () => { cancelled = true; };
  }, [address, connected]);

  const items = isAdmin ? [...NAV, { href: "/admin", label: "Admin", icon: ShieldCheck }] : NAV;

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-obsidian border-r border-bone-border flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-bone-border">
        <p className="font-heading text-2xl text-parchment tracking-widest">VEILPACT</p>
        <p className="text-xs text-muted-parchment font-mono mt-0.5">Selective reveal pacts</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {items.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 text-sm transition-colors",
                active
                  ? "text-parchment bg-parchment/5 border-r-2 border-sealed-gold"
                  : "text-muted-parchment hover:text-parchment hover:bg-white/3",
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-bone-border">
        <p className="text-xs text-muted-parchment/50 leading-relaxed">
          Private by default. Committed on GenLayer. Not legal advice.
        </p>
      </div>
    </aside>
  );
}
