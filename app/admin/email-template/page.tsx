"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "../admin-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Save, RefreshCw, Loader2, Plus, Trash2, GripVertical,
  Eye, EyeOff, ChevronDown, ChevronUp, Mail, Cake, Trophy,
  Bell, XCircle, Info,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────
interface InfoBlock { emoji: string; title: string; desc: string; }

interface TemplateData {
  email_park_name: string;
  email_park_emoji: string;
  email_park_location: string;
  email_phone: string;
  email_from_name: string;
  email_birthday_header_subtitle: string;
  email_birthday_intro: string;
  email_birthday_info_blocks: string;
  email_birthday_contact_text: string;
  email_futsal_header_subtitle: string;
  email_futsal_intro: string;
  email_futsal_tip: string;
  email_cancel_message: string;
  email_reminder_message: string;
}

const SECTION_TABS = [
  { id: "general", label: "🏷️ Général", icon: Info },
  { id: "birthday", label: "🎂 Anniversaire", icon: Cake },
  { id: "futsal", label: "⚽ Futsal", icon: Trophy },
  { id: "notifications", label: "🔔 Notifications", icon: Bell },
];

// ─── Live Preview ────────────────────────────────────────────────────
function LivePreview({ tpl, blocks, type }: { tpl: TemplateData; blocks: InfoBlock[]; type: "birthday" | "futsal" | "cancel" | "reminder" }) {
  const phone = tpl.email_phone || "0692 XX XX XX";
  const parkName = tpl.email_park_name || "Ocorner";
  const parkEmoji = tpl.email_park_emoji || "🎡⚽";

  const headerGradient = type === "futsal"
    ? "linear-gradient(135deg,#1d4ed8 0%,#7c3aed 100%)"
    : type === "cancel"
    ? "#ef4444"
    : type === "reminder"
    ? "#f59e0b"
    : "linear-gradient(135deg,#10b981 0%,#3b82f6 100%)";

  const headerEmoji = type === "futsal" ? "⚽🏟️" : type === "cancel" ? "❌" : type === "reminder" ? "⏰" : parkEmoji;
  const headerTitle = type === "futsal" ? `${parkName} Futsal` : type === "cancel" ? "Réservation annulée" : type === "reminder" ? "Rappel : Acompte en attente" : `${parkName} Réservation`;
  const headerSub = type === "futsal" ? tpl.email_futsal_header_subtitle : type === "cancel" ? "" : type === "reminder" ? "" : tpl.email_birthday_header_subtitle;

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", maxWidth: 580, margin: "0 auto", background: "#f1f5f9", padding: 16, borderRadius: 16 }}>
      <div style={{ background: "white", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 32px rgba(0,0,0,0.08)" }}>
        {/* Header */}
        <div style={{ background: headerGradient, padding: "28px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>{headerEmoji}</div>
          <h2 style={{ margin: 0, color: "white", fontSize: 22, fontWeight: 800 }}>{headerTitle}</h2>
          {headerSub && <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.85)", fontSize: 14 }}>{headerSub}</p>}
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px" }}>
          <p style={{ fontSize: 15, color: "#1e293b" }}>Bonjour <strong>Marie Dupont</strong>,</p>

          {type === "birthday" && (
            <>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{tpl.email_birthday_intro}</p>
              {/* Recap table */}
              <div style={{ background: "#f8fafc", borderRadius: 10, overflow: "hidden", margin: "16px 0", border: "1px solid #e2e8f0" }}>
                <div style={{ background: "#1e293b", padding: "10px 14px" }}>
                  <p style={{ margin: 0, color: "white", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>📋 Détails de la réservation</p>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  {[["Référence","OCR-XXXXX"],["Formule","Pack Marmaille Parc"],["Date","Samedi 14 juin 2025"],["Créneau","09:00-12:00"],["Enfants","12 enfants"],["Total","240,00 €"]].map(([l,v],i) => (
                    <tr key={i}>
                      <td style={{ padding: "7px 12px", color: "#64748b", fontSize: 13, borderBottom: "1px solid #f1f5f9" }}>{l}</td>
                      <td style={{ padding: "7px 12px", fontSize: 13, fontWeight: i===5?"bold":"500", color: i===5?"#10b981":"#1e293b", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>{v}</td>
                    </tr>
                  ))}
                </table>
              </div>
              {/* Info blocks */}
              {blocks.length > 0 && (
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: 16, margin: "16px 0" }}>
                  <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#15803d" }}>📌 Informations pratiques</p>
                  {blocks.map((b, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{b.emoji}</span>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#166534" }}>{b.title}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#166534", lineHeight: 1.5 }}>{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Contact */}
              <div style={{ textAlign: "center", padding: 14, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>{tpl.email_birthday_contact_text}</p>
                <p style={{ margin: "6px 0 0", fontSize: 17, fontWeight: 700, color: "#10b981" }}>📞 {phone}</p>
              </div>
            </>
          )}

          {type === "futsal" && (
            <>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{tpl.email_futsal_intro}</p>
              {tpl.email_futsal_tip && (
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px", margin: "12px 0" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#1d4ed8", fontWeight: 600 }}>💡 Bon à savoir</p>
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "#1e40af" }}>{tpl.email_futsal_tip}</p>
                </div>
              )}
            </>
          )}

          {type === "cancel" && (
            <>
              <p style={{ fontSize: 13, color: "#475569" }}>Votre réservation <strong>OCR-XXXXX</strong> du <strong>14 juin 2025</strong> a été annulée.</p>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{tpl.email_cancel_message}</p>
              <p style={{ fontSize: 17, fontWeight: 700, color: "#ef4444" }}>📞 {phone}</p>
            </>
          )}

          {type === "reminder" && (
            <>
              <p style={{ fontSize: 13, color: "#475569" }}>Votre réservation <strong>OCR-XXXXX</strong> est en attente d'acompte de <strong>80,00 €</strong>.</p>
              <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 10, padding: 14, margin: "12px 0" }}>
                <p style={{ margin: 0, fontSize: 13, color: "#92400e", fontWeight: 600 }}>⚠️ {tpl.email_reminder_message}</p>
              </div>
              <p style={{ fontSize: 17, fontWeight: 700, color: "#f59e0b" }}>📞 {phone}</p>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "12px 24px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>Réf. <strong>OCR-XXXXX</strong> · {parkName}, La Réunion · Ce mail a été envoyé automatiquement.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Info Block Editor ────────────────────────────────────────────────
function InfoBlockEditor({ blocks, onChange }: { blocks: InfoBlock[]; onChange: (b: InfoBlock[]) => void }) {
  function update(i: number, field: keyof InfoBlock, value: string) {
    const next = blocks.map((b, idx) => idx === i ? { ...b, [field]: value } : b);
    onChange(next);
  }
  function remove(i: number) { onChange(blocks.filter((_, idx) => idx !== i)); }
  function add() { onChange([...blocks, { emoji: "✨", title: "Titre", desc: "Description de l'information." }]); }
  function move(i: number, dir: -1 | 1) {
    const next = [...blocks];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <GripVertical className="w-4 h-4 text-gray-300" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bloc {i + 1}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === blocks.length - 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => remove(i)} className="p-1 rounded hover:bg-red-50 text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-[56px_1fr] gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Emoji</label>
              <Input value={b.emoji} onChange={e => update(i, "emoji", e.target.value)}
                className="text-center text-lg h-9" maxLength={4} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Titre</label>
              <Input value={b.title} onChange={e => update(i, "title", e.target.value)} className="h-9" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Description</label>
            <textarea value={b.desc} onChange={e => update(i, "desc", e.target.value)}
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
      ))}
      <button onClick={add}
        className="w-full h-10 rounded-xl border-2 border-dashed border-emerald-300 flex items-center justify-center gap-2 text-sm text-emerald-600 hover:bg-emerald-50 transition-all font-medium">
        <Plus className="w-4 h-4" /> Ajouter un bloc d'info
      </button>
    </div>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function TextField({ label, hint, value, onChange, multiline = false, rows = 3 }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void; multiline?: boolean; rows?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
      ) : (
        <Input value={value} onChange={e => onChange(e.target.value)} />
      )}
    </Field>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function EmailTemplatePage() {
  const { token } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [previewType, setPreviewType] = useState<"birthday" | "futsal" | "cancel" | "reminder">("birthday");
  const [showPreview, setShowPreview] = useState(true);

  const [tpl, setTpl] = useState<TemplateData>({
    email_park_name: "Ocorner",
    email_park_emoji: "🎡⚽",
    email_park_location: "La Réunion",
    email_phone: "0692 XX XX XX",
    email_from_name: "Ocorner",
    email_birthday_header_subtitle: "Votre anniversaire est confirmé 🎉",
    email_birthday_intro: "",
    email_birthday_info_blocks: "[]",
    email_birthday_contact_text: "Une question ? Contactez-nous :",
    email_futsal_header_subtitle: "Votre terrain est réservé !",
    email_futsal_intro: "",
    email_futsal_tip: "",
    email_cancel_message: "",
    email_reminder_message: "",
  });

  const [blocks, setBlocks] = useState<InfoBlock[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/email-template", { headers: { "x-admin-token": token } });
      const data = await res.json();
      setTpl(data);
      try { setBlocks(JSON.parse(data.email_birthday_info_blocks ?? "[]")); } catch { setBlocks([]); }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function set(key: keyof TemplateData, value: string) {
    setTpl(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    if (!token) return;
    setSaving(true);
    try {
      const payload = { ...tpl, email_birthday_info_blocks: JSON.stringify(blocks) };
      await fetch("/api/admin/email-template", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify(payload),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
    </div>
  );

  const tplWithBlocks = { ...tpl, email_birthday_info_blocks: JSON.stringify(blocks) };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-6 h-6 text-emerald-500" /> Template Email
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Personnalisez le contenu des emails envoyés aux clients</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(v => !v)} className="gap-2">
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? "Masquer" : "Préview"}
          </Button>
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </Button>
          <Button onClick={save} disabled={saving} className={cn("gap-2", saved ? "bg-green-600 hover:bg-green-700" : "bg-emerald-600 hover:bg-emerald-700")}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? "Sauvegardé ✓" : "Sauvegarder"}
          </Button>
        </div>
      </div>

      <div className={cn("grid gap-6", showPreview ? "lg:grid-cols-[1fr_520px]" : "grid-cols-1")}>
        {/* ─── Editor ─── */}
        <div className="space-y-4">
          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-100 overflow-x-auto">
              {SECTION_TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 min-w-[120px] px-4 py-3.5 text-sm font-medium transition-all border-b-2 whitespace-nowrap",
                    activeTab === tab.id
                      ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  )}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-5">
              {/* ─ General ─ */}
              {activeTab === "general" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <TextField label="Nom du parc" hint="Affiché dans l'en-tête et le pied de page"
                      value={tpl.email_park_name} onChange={v => set("email_park_name", v)} />
                    <TextField label="Nom expéditeur" hint="Nom affiché dans la boîte mail du client"
                      value={tpl.email_from_name} onChange={v => set("email_from_name", v)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <TextField label="Emoji en-tête" hint="Affiché dans le header de l'email anniversaire"
                      value={tpl.email_park_emoji} onChange={v => set("email_park_emoji", v)} />
                    <TextField label="Téléphone de contact" hint="Affiché dans tous les emails"
                      value={tpl.email_phone} onChange={v => set("email_phone", v)} />
                  </div>
                  <TextField label="Localisation" hint="Ex : La Réunion, 974"
                    value={tpl.email_park_location} onChange={v => set("email_park_location", v)} />
                </>
              )}

              {/* ─ Birthday ─ */}
              {activeTab === "birthday" && (
                <>
                  <TextField label="Sous-titre de l'en-tête"
                    hint="Ligne sous le titre dans l'en-tête vert"
                    value={tpl.email_birthday_header_subtitle} onChange={v => set("email_birthday_header_subtitle", v)} />
                  <TextField label="Message d'introduction"
                    hint="Paragraphe d'accueil après le prénom du client"
                    value={tpl.email_birthday_intro} onChange={v => set("email_birthday_intro", v)}
                    multiline rows={3} />
                  <TextField label="Texte bouton contact"
                    hint="Phrase au-dessus du numéro de téléphone"
                    value={tpl.email_birthday_contact_text} onChange={v => set("email_birthday_contact_text", v)} />
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Blocs d'informations pratiques</label>
                    <p className="text-xs text-gray-400 mb-3">Section verte avec icônes — ajoutez, réorganisez et modifiez librement</p>
                    <InfoBlockEditor blocks={blocks} onChange={b => { setBlocks(b); setSaved(false); }} />
                  </div>
                </>
              )}

              {/* ─ Futsal ─ */}
              {activeTab === "futsal" && (
                <>
                  <TextField label="Sous-titre de l'en-tête"
                    hint="Ligne sous le titre dans l'en-tête bleu"
                    value={tpl.email_futsal_header_subtitle} onChange={v => set("email_futsal_header_subtitle", v)} />
                  <TextField label="Message d'introduction"
                    hint="Paragraphe d'accueil après le prénom du client"
                    value={tpl.email_futsal_intro} onChange={v => set("email_futsal_intro", v)}
                    multiline rows={3} />
                  <TextField label="Conseil / Bon à savoir"
                    hint="Bloc bleu clair en bas de l'email. Laissez vide pour masquer."
                    value={tpl.email_futsal_tip} onChange={v => set("email_futsal_tip", v)}
                    multiline rows={2} />
                </>
              )}

              {/* ─ Notifications ─ */}
              {activeTab === "notifications" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Message de rappel d'acompte</label>
                    <p className="text-xs text-gray-400 mb-1.5">Texte dans le bloc jaune ⚠️ de l'email de rappel</p>
                    <textarea value={tpl.email_reminder_message} onChange={e => set("email_reminder_message", e.target.value)} rows={3}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Message d'annulation</label>
                    <p className="text-xs text-gray-400 mb-1.5">Texte affiché dans l'email rouge d'annulation</p>
                    <textarea value={tpl.email_cancel_message} onChange={e => set("email_cancel_message", e.target.value)} rows={3}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ─── Preview ─── */}
        {showPreview && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Aperçu en direct</p>
                <div className="flex gap-1 flex-wrap justify-end">
                  {([
                    { v: "birthday", l: "🎂 Anniv." },
                    { v: "futsal", l: "⚽ Futsal" },
                    { v: "reminder", l: "⏰ Rappel" },
                    { v: "cancel", l: "❌ Annulation" },
                  ] as const).map(({ v, l }) => (
                    <button key={v} onClick={() => setPreviewType(v)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                        previewType === v ? "bg-gray-900 text-white border-gray-900" : "text-gray-600 border-gray-200 hover:border-gray-400"
                      )}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-auto rounded-xl border border-gray-100 bg-slate-100 p-3 max-h-[80vh]">
                <LivePreview tpl={tplWithBlocks} blocks={blocks} type={previewType} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
