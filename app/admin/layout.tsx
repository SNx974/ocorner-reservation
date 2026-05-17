"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, CalendarDays, Settings, LogOut,
  Menu, X, ChevronRight, Tag, Trophy, Clock, Utensils,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminContextType {
  token: string | null;
  setToken: (t: string | null) => void;
}

export const AdminContext = createContext<AdminContextType>({ token: null, setToken: () => {} });
export const useAdmin = () => useContext(AdminContext);

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/reservations", icon: CalendarDays, label: "Réservations" },
  { href: "/admin/planning-futsal", icon: Trophy, label: "Planning Futsal" },
  { href: "/admin/creneaux", icon: Clock, label: "Créneaux" },
  { href: "/admin/formules", icon: Utensils, label: "Formules & Tarifs" },
  { href: "/admin/promo", icon: Tag, label: "Codes promo" },
  { href: "/admin/settings", icon: Settings, label: "Paramètres" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("admin_token");
    if (stored) setTokenState(stored);
  }, []);

  function setToken(t: string | null) {
    setTokenState(t);
    if (t) localStorage.setItem("admin_token", t);
    else localStorage.removeItem("admin_token");
  }

  function logout() {
    setToken(null);
    router.push("/admin");
  }

  return (
    <AdminContext.Provider value={{ token, setToken }}>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex flex-col w-64 bg-gray-900 text-white shrink-0">
          <div className="p-6 border-b border-gray-700">
            <div className="text-2xl mb-1">🎡⚽</div>
            <h1 className="font-bold text-white">Ocorner</h1>
            <p className="text-gray-400 text-xs mt-0.5">Panneau Administration</p>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map(item => (
              <Link key={item.href} href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                  pathname === item.href
                    ? "bg-emerald-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
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

        {/* Mobile header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎡</span>
            <span className="font-bold text-sm">Admin</span>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-gray-900/95 pt-14 px-4">
            <nav className="space-y-2 mt-4">
              {navItems.map(item => (
                <Link key={item.href} href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center justify-between px-4 py-4 rounded-xl text-base font-medium",
                    pathname === item.href ? "bg-emerald-600 text-white" : "text-gray-300 hover:bg-gray-800"
                  )}>
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </Link>
              ))}
              {token && (
                <button onClick={logout}
                  className="flex items-center gap-3 px-4 py-4 rounded-xl text-red-400 hover:bg-gray-800 w-full text-base font-medium">
                  <LogOut className="w-5 h-5" /> Déconnexion
                </button>
              )}
            </nav>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 md:overflow-auto pt-14 md:pt-0">
          {children}
        </main>
      </div>
    </AdminContext.Provider>
  );
}
