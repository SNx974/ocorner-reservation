"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "../admin-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Trash2, Loader2, X, Shield, UserCog, Eye, EyeOff,
  CheckCircle, AlertTriangle, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AdminUser {
  id: string;
  username: string;
  role: "admin" | "moderateur";
  isActive: boolean;
  createdAt: string;
}

const ROLE_CONFIG = {
  admin: {
    label: "Administrateur",
    desc: "Accès total : paramètres, formules, créneaux, codes promo, comptes",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
    icon: Shield,
  },
  moderateur: {
    label: "Modérateur",
    desc: "Dashboard (sans CA global), réservations, plannings, emails, réservation rapide",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    dot: "bg-blue-500",
    icon: UserCog,
  },
};

export default function AccountsPage() {
  const { token, role: myRole } = useAdmin();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "moderateur">("moderateur");
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [showResetPwd, setShowResetPwd] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/accounts", { headers: { "x-admin-token": token } });
      if (res.ok) setUsers(await res.json());
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Guard: only admins can access this page
  if (myRole !== "admin") {
    return (
      <div className="p-8 text-center">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Accès réservé aux administrateurs</p>
      </div>
    );
  }

  async function createUser() {
    if (!newUsername.trim() || !newPassword) return;
    setSaving(true); setError("");
    const res = await fetch("/api/admin/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token! },
      body: JSON.stringify({ username: newUsername.trim(), password: newPassword, role: newRole }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setError(json.error); return; }
    setShowAdd(false); setNewUsername(""); setNewPassword(""); setNewRole("moderateur"); setError("");
    load();
  }

  async function toggleActive(user: AdminUser) {
    await fetch("/api/admin/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token! },
      body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
    });
    load();
  }

  async function changeRole(user: AdminUser, role: "admin" | "moderateur") {
    await fetch("/api/admin/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token! },
      body: JSON.stringify({ id: user.id, role }),
    });
    load();
  }

  async function resetPassword() {
    if (!resetPwd || !resetId) return;
    setSaving(true);
    await fetch("/api/admin/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token! },
      body: JSON.stringify({ id: resetId, newPassword: resetPwd }),
    });
    setSaving(false); setResetId(null); setResetPwd(""); setShowResetPwd(false);
  }

  async function deleteUser(id: string, username: string) {
    if (!confirm(`Supprimer le compte "${username}" ?`)) return;
    await fetch("/api/admin/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-token": token! },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-500" /> Gestion des comptes
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Créez et gérez les accès à l'administration</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nouveau compte
          </Button>
        </div>
      </div>

      {/* Roles explanation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {(Object.entries(ROLE_CONFIG) as [string, typeof ROLE_CONFIG.admin][]).map(([key, cfg]) => (
          <div key={key} className={cn("rounded-xl border p-4", cfg.color)}>
            <div className="flex items-center gap-2 mb-1">
              <cfg.icon className="w-4 h-4" />
              <span className="font-bold text-sm">{cfg.label}</span>
            </div>
            <p className="text-xs opacity-80 leading-relaxed">{cfg.desc}</p>
          </div>
        ))}
      </div>

      {/* Create modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-lg">Nouveau compte</h2>
              <button onClick={() => { setShowAdd(false); setError(""); }}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'utilisateur</label>
                <Input value={newUsername} onChange={e => setNewUsername(e.target.value)}
                  placeholder="ex: marie.dupont" autoComplete="off" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                <div className="relative">
                  <Input type={showPwd ? "text" : "password"} value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 caractères" autoComplete="new-password"
                    className="pr-10" />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Niveau d'accès</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["admin", "moderateur"] as const).map(r => {
                    const cfg = ROLE_CONFIG[r];
                    return (
                      <button key={r} type="button" onClick={() => setNewRole(r)}
                        className={cn(
                          "rounded-xl border-2 p-3 text-left transition-all",
                          newRole === r ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"
                        )}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                          <span className="text-sm font-bold text-gray-900">{cfg.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-tight">{cfg.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => { setShowAdd(false); setError(""); }}>Annuler</Button>
              <Button onClick={createUser} disabled={saving || !newUsername.trim() || newPassword.length < 6} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Créer le compte
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Réinitialiser le mot de passe</h2>
              <button onClick={() => setResetId(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="relative">
              <Input type={showResetPwd ? "text" : "password"} value={resetPwd}
                onChange={e => setResetPwd(e.target.value)}
                placeholder="Nouveau mot de passe" className="pr-10" />
              <button type="button" onClick={() => setShowResetPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showResetPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" size="sm" onClick={() => setResetId(null)}>Annuler</Button>
              <Button size="sm" onClick={resetPassword} disabled={saving || resetPwd.length < 6} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Sauvegarder
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* User list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
      ) : (
        <div className="space-y-3">
          {users.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <UserCog className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Aucun compte créé. Seule la connexion par mot de passe ADMIN_SECRET est active.</p>
            </div>
          )}
          {users.map(user => {
            const cfg = ROLE_CONFIG[user.role];
            return (
              <div key={user.id} className={cn(
                "bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 flex-wrap",
                !user.isActive && "opacity-60"
              )}>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", cfg.color)}>
                  <cfg.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900">{user.username}</p>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", cfg.color)}>
                      {cfg.label}
                    </span>
                    {!user.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Inactif</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Créé le {format(new Date(user.createdAt), "d MMM yyyy", { locale: fr })}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Role toggle */}
                  <select
                    value={user.role}
                    onChange={e => changeRole(user, e.target.value as "admin" | "moderateur")}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option value="admin">Admin</option>
                    <option value="moderateur">Modérateur</option>
                  </select>
                  {/* Active toggle */}
                  <button onClick={() => toggleActive(user)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors",
                      user.isActive
                        ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                        : "bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700"
                    )}>
                    {user.isActive ? "Actif" : "Inactif"}
                  </button>
                  {/* Reset password */}
                  <button onClick={() => { setResetId(user.id); setResetPwd(""); }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors">
                    🔑 MDP
                  </button>
                  {/* Delete */}
                  <button onClick={() => deleteUser(user.id, user.username)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
