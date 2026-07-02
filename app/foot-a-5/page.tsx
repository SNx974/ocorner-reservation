import Link from "next/link";
import Image from "next/image";
import { Users, Calendar, CreditCard, ArrowRight, Trophy } from "lucide-react";

export default function FutsalPage() {
  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm">
          ← Accueil
        </Link>
        <Image src="/logo-foot.png" alt="Foot à 5" width={160} height={55} style={{ objectFit: "contain" }} />
      </header>

      {/* Hero */}
      <div className="px-6 pt-4 pb-12 text-center max-w-2xl mx-auto">
        <div className="flex justify-center mb-6">
          <Image src="/logo-foot.png" alt="Foot à 5" width={420} height={140} style={{ objectFit: "contain", maxWidth: "100%" }} />
        </div>
        <p className="text-white/60 text-lg">
          3 terrains disponibles · 9h à 22h · À partir de 10 joueurs
        </p>
      </div>

      {/* CTAs */}
      <div className="px-6 max-w-lg mx-auto space-y-4 pb-12">
        {/* Book */}
        <Link href="/foot-a-5/reserver"
          className="flex items-center justify-between bg-white rounded-2xl p-5 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "#1bbfa820" }}>
              <Calendar className="w-7 h-7" style={{ color: "#1bbfa8" }} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">Je réserve un terrain</p>
              <p className="text-gray-500 text-sm">Choisissez la date, l'heure et le terrain</p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-blue-600 group-hover:translate-x-1 transition-transform" />
        </Link>

        {/* Pay my spot */}
        <Link href="/foot-a-5/payer"
          className="flex items-center justify-between backdrop-blur-sm border rounded-2xl p-5 hover:bg-white/5 transition-all group" style={{ borderColor: "#1bbfa840", background: "#1bbfa810" }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
              <CreditCard className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-lg">Je paye ma place</p>
              <p className="text-blue-200 text-sm">Entrez la référence de votre groupe</p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Info cards */}
      <div className="px-6 max-w-3xl mx-auto pb-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <Trophy className="w-6 h-6" />, title: "3 Terrains", desc: "Terrains de qualité professionnelle" },
          { icon: <Users className="w-6 h-6" />, title: "Min. 10 joueurs", desc: "Pour une équipe complète" },
          { icon: <Calendar className="w-6 h-6" />, title: "9h – 22h", desc: "Créneaux toutes les heures" },
        ].map((c) => (
          <div key={c.title} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <div className="text-blue-300 flex justify-center mb-2">{c.icon}</div>
            <p className="font-bold text-white">{c.title}</p>
            <p className="text-blue-300 text-sm mt-0.5">{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
