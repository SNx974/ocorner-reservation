"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "../admin-context";
import {
  Mail, Search, RefreshCw, Send, Download, Eye, X,
  CheckCircle, AlertTriangle, Clock, Filter, ChevronLeft, ChevronRight, FlaskConical, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface EmailSummary {
  id: string; to: string; subject: string; type: string;
  reference: string | null; status: string; sentAt: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  confirmation: { label: "Confirmation", color: "bg-emerald-100 text-emerald-700" },
  reminder:     { label: "Rappel",       color: "bg-amber-100 text-amber-700" },
  cancellation: { label: "Annulation",   color: "bg-red-100 text-red-700" },
  manual:       { label: "Renvoi",       color: "bg-blue-100 text-blue-700" },
  test:         { label: "Test",         color: "bg-indigo-100 text-indigo-700" },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  sent:    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
  failed:  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
  no_key:  <Clock className="w-3.5 h-3.5 text-gray-400" />,
};

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = { sent: "Envoyé", failed: "Échec", no_key: "Sans clé" };
  const colors: Record<string, string> = {
    sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
    failed: "bg-red-50 text-red-700 border-red-200",
    no_key: "bg-gray-50 text-gray-500 border-gray-200",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium", colors[status] ?? colors.no_key)}>
      {STATUS_ICONS[status]}
      {labels[status] ?? status}
    </span>
  );
}

export default function EmailsPage() {
  const { token } = useAdmin();
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ id: string; subject: string; to: string; html: string; sentAt: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (typeFilter) params.set("type", typeFilter);
    const res = await fetch(`/api/admin/emails?${params}`, { headers: { "x-admin-token": token } });
    const data = await res.json();
    setEmails(data.emails ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setLoading(false);
  }, [token, page, search, typeFilter]);

  useEffect(() => { load(); }, [load]);

  async function openPreview(id: string) {
    setPreviewLoading(true);
    const res = await fetch(`/api/admin/emails?id=${id}`, { headers: { "x-admin-token": token! } });
    const data = await res.json();
    setPreview({ id: data.id, subject: data.subject, to: data.to, html: data.htmlContent, sentAt: data.sentAt });
    setPreviewLoading(false);
  }

  async function sendTestMail() {
    if (!testEmailTo.includes("@")) { showToast("❌ Email invalide"); return; }
    setSendingTest(true);
    const res = await fetch("/api/admin/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token! },
      body: JSON.stringify({ action: "test", to: testEmailTo }),
    });
    const data = await res.json();
    setSendingTest(false);
    setShowTestModal(false);
    if (data.success) { showToast(`✅ Mail de test envoyé à ${testEmailTo} !`); load(); }
    else showToast(`❌ Erreur : ${data.error ?? "Échec de l'envoi"}`);
  }

  async function resend(id: string) {
    setResending(id);
    const res = await fetch("/api/admin/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token! },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    setResending(null);
    if (data.success) { showToast("✅ Email renvoyé !"); load(); }
    else showToast("❌ Erreur lors du renvoi");
  }

  function exportHtml(email: { subject: string; html: string; to: string }) {
    const blob = new Blob([email.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-${email.subject.replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printEmail(html: string) {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  if (!token) return <p className="p-6 text-gray-500">Veuillez vous connecter.</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium animate-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-6 h-6 text-emerald-600" /> Boîte mail envoyée
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} email{total !== 1 ? "s" : ""} au total</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowTestModal(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            <FlaskConical className="w-4 h-4" /> Envoyer un mail de test
          </Button>
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </Button>
        </div>
      </div>

      {/* Test email modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-indigo-600" /> Mail de test Brevo
              </h3>
              <button onClick={() => setShowTestModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Envoyez un email de test pour vérifier que votre configuration <strong>Brevo</strong> fonctionne correctement.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse email de destination</label>
            <Input
              type="email"
              placeholder="votre@email.com"
              value={testEmailTo}
              onChange={e => setTestEmailTo(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendTestMail()}
              className="mb-4"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowTestModal(false)}>Annuler</Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={sendTestMail}
                disabled={sendingTest || !testEmailTo.includes("@")}
              >
                {sendingTest ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Envoi...</> : <><Send className="w-4 h-4 mr-1" />Envoyer</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher par email, réf, objet..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {["", "confirmation", "reminder", "cancellation", "manual"].map(t => (
            <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                typeFilter === t
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              )}>
              {t === "" ? "Tous" : TYPE_LABELS[t]?.label ?? t}
            </button>
          ))}
        </div>
      </div>

      {/* Email list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && emails.length === 0 && (
          <div className="text-center py-16">
            <Mail className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Aucun email trouvé</p>
          </div>
        )}

        {!loading && emails.map(email => {
          const typeMeta = TYPE_LABELS[email.type] ?? { label: email.type, color: "bg-gray-100 text-gray-600" };
          return (
            <div key={email.id}
              className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
              {/* Status dot */}
              <div className="shrink-0">{STATUS_ICONS[email.status] ?? STATUS_ICONS.no_key}</div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", typeMeta.color)}>
                    {typeMeta.label}
                  </span>
                  {email.reference && (
                    <span className="text-xs font-mono text-gray-400">{email.reference}</span>
                  )}
                </div>
                <p className="font-medium text-gray-900 text-sm mt-0.5 truncate">{email.subject}</p>
                <p className="text-xs text-gray-400 truncate">{email.to}</p>
              </div>

              {/* Date */}
              <div className="text-xs text-gray-400 shrink-0 hidden sm:block">
                {format(parseISO(email.sentAt), "d MMM à HH:mm", { locale: fr })}
              </div>

              {/* Status */}
              <div className="shrink-0">
                <StatusBadge status={email.status} />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openPreview(email.id)}
                  title="Prévisualiser"
                  className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
                <button onClick={() => resend(email.id)} disabled={resending === email.id}
                  title="Renvoyer"
                  className="p-2 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors">
                  {resending === email.id
                    ? <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">Page {page} / {pages}</span>
          <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Preview modal */}
      {(preview || previewLoading) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
            {previewLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : preview && (
              <>
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 truncate">{preview.subject}</p>
                    <p className="text-sm text-gray-500">À : {preview.to} · {format(parseISO(preview.sentAt), "d MMMM yyyy à HH:mm", { locale: fr })}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <button onClick={() => exportHtml(preview)}
                      title="Exporter HTML"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                      <Download className="w-3.5 h-3.5" /> Exporter
                    </button>
                    <button onClick={() => printEmail(preview.html)}
                      title="Imprimer / Sauvegarder PDF"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                      🖨️ Imprimer
                    </button>
                    <button onClick={() => resend(preview.id)}
                      disabled={resending === preview.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors">
                      <Send className="w-3.5 h-3.5" />
                      {resending === preview.id ? "Envoi..." : "Renvoyer"}
                    </button>
                    <button onClick={() => setPreview(null)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Email iframe preview */}
                <div className="p-4">
                  <iframe
                    srcDoc={preview.html}
                    className="w-full rounded-xl border border-gray-200"
                    style={{ height: "600px" }}
                    sandbox="allow-same-origin"
                    title="Aperçu email"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
