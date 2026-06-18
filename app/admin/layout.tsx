"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, CalendarDays, Settings, LogOut,
  Menu, X, ChevronRight, Tag, Trophy, Clock, Utensils,
  Mail, PartyPopper, Palette, Users, Ticket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminContext, AdminRole } from "./admin-context";

// ─── Nav structure ────────────────────────────────────────────────────
interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  adminOnly?: boolean;
}

interface NavGroup {
  label?: string;          // undefined = no separator
  items: NavItem[];
  adminOnly?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/admin/reservations", icon: CalendarDays, label: "Réservations" },
    ],
  },
  {
    label: "Plannings",
    items: [
      { href: "/admin/planning-anniversaire", icon: PartyPopper, label: "Anniversaire" },
      { href: "/admin/planning-futsal", icon: Trophy, label: "Foot à 5" },
    ],
  },
  {
    label: "Communication",
    items: [
      { href: "/admin/emails", icon: Mail, label: "Emails envoyés" },
      { href: "/admin/email-template", icon: Palette, label: "Template Email", adminOnly: true },
    ],
  },
  {
    label: "Configuration",
    adminOnly: true,
    items: [
      { href: "/admin/events", icon: Ticket, label: "Événements" },
      { href: "/admin/creneaux", icon: Clock, label: "Créneaux" },
      { href: "/admin/formules", icon: Utensils, label: "Formules & Tarifs" },
      { href: "/admin/promo", icon: Tag, label: "Codes promo" },
      { href: "/admin/settings", icon: Settings, label: "Paramètres" },
    ],
  },
  {
    label: "Administration",
    adminOnly: true,
    items: [
      { href: "/admin/accounts", icon: Users, label: "Comptes" },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [role, setRoleState] = useState<AdminRole>("moderateur");
  const [username, setUsernameState] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("admin_token");
    const storedRole = (localStorage.getItem("admin_role") ?? "moderateur") as AdminRole;
    const storedUser = localStorage.getItem("admin_username");
    if (stored) { setTokenState(stored); setRoleState(storedRole); setUsernameState(storedUser); }
  }, []);

  function setToken(t: string | null) {
    setTokenState(t);
    if (t) localStorage.setItem("admin_token", t);
    else { localStorage.removeItem("admin_token"); localStorage.removeItem("admin_role"); localStorage.removeItem("admin_username"); }
  }

  function setRole(r: AdminRole) {
    setRoleState(r);
    localStorage.setItem("admin_role", r);
  }

  function setUsername(u: string | null) {
    setUsernameState(u);
    if (u) localStorage.setItem("admin_username", u);
    else localStorage.removeItem("admin_username");
  }

  function logout() {
    setToken(null); setRole("moderateur"); setUsername(null);
    router.push("/admin");
  }

  const isAdmin = role === "admin";

  function renderNavGroups(mobile = false) {
    return NAV_GROUPS.map((group, gi) => {
      // Hide whole group if adminOnly and not admin
      if (group.adminOnly && !isAdmin) return null;

      const visibleItems = group.items.filter(item => !item.adminOnly || isAdmin);
      if (visibleItems.length === 0) return null;

      return (
        <div key={gi}>
          {group.label && (
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {group.label}
            </p>
          )}
          {visibleItems.map(item => (
            <Link key={item.href} href={item.href}
              onClick={mobile ? () => setMobileOpen(false) : undefined}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium mx-1",
                pathname === item.href
                  ? "bg-emerald-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}>
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
              {mobile && <ChevronRight className="w-4 h-4 opacity-40 ml-auto" />}
            </Link>
          ))}
        </div>
      );
    });
  }

  return (
    <AdminContext.Provider value={{ token, role, username, setToken, setRole, setUsername }}>
      <div className="min-h-screen bg-gray-50 flex">

        {/* ── Sidebar desktop ── */}
        <aside className="hidden md:flex flex-col w-60 bg-gray-900 text-white shrink-0">
          <div className="p-5 border-b border-gray-700">
            <div className="text-2xl mb-1">🎡⚽</div>
            <h1 className="font-bold text-white text-sm">Ocorner</h1>
            <p className="text-gray-400 text-xs mt-0.5">Administration</p>
          </div>

          {/* Role badge */}
          {token && (
            <div className="px-5 py-2 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isAdmin ? "bg-emerald-400" : "bg-blue-400"
                )} />
                <span className="text-xs text-gray-400">
                  {username ?? "admin"} · <span className={cn("font-semibold", isAdmin ? "text-emerald-400" : "text-blue-400")}>
                    {isAdmin ? "Admin" : "Modérateur"}
                  </span>
                </span>
              </div>
            </div>
          )}

          <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
            {renderNavGroups()}
          </nav>

          {token && (
            <div className="p-4 border-t border-gray-700">
              <button onClick={logout}
                className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors w-full px-4 py-2 rounded-xl hover:bg-gray-800">
                <LogOut className="w-4 h-4" /> Déconnexion
              </button>
            </div>
          )}
        </aside>

        {/* ── Mobile header ── */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎡</span>
            <span className="font-bold text-sm">Admin</span>
            {token && (
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", isAdmin ? "bg-emerald-700 text-emerald-200" : "bg-blue-800 text-blue-200")}>
                {isAdmin ? "Admin" : "Modo"}
              </span>
            )}
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* ── Mobile nav ── */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-gray-900/95 pt-14 px-4 overflow-y-auto">
            <nav className="space-y-1 mt-4">
              {renderNavGroups(true)}
              {token && (
                <button onClick={logout}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-gray-800 w-full text-sm font-medium mt-4">
                  <LogOut className="w-4 h-4" /> Déconnexion
                </button>
              )}
            </nav>
          </div>
        )}

        {/* ── Main ── */}
        <main className="flex-1 min-w-0 overflow-x-auto pt-14 md:pt-0">
          {token && !isAdmin && (
            <div className="bg-blue-50 border-b border-blue-200 text-blue-800 text-sm px-4 py-2 flex items-center gap-2">
              <span>👁️</span>
              <span><strong>Mode consultation</strong> — votre compte modérateur permet uniquement de consulter. Les modifications sont réservées aux administrateurs.</span>
            </div>
          )}
          {children}
        </main>
      </div>
    </AdminContext.Provider>
  );
}
