/** @type {import('next').NextConfig} */

const securityHeaders = [
  // ── Empêche le clickjacking ──────────────────────────────────────────────
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // ── Empêche le MIME sniffing ─────────────────────────────────────────────
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // ── Politique de referrer ────────────────────────────────────────────────
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // ── Désactive caméra / micro / géoloc ───────────────────────────────────
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // ── Content Security Policy ──────────────────────────────────────────────
  // - 'unsafe-inline' + 'unsafe-eval' requis pour le runtime Next.js
  // - js.stripe.com autorisé pour le paiement Stripe
  // - frame-src pour les iframes Stripe (3D Secure, etc.)
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig = {
  output: "standalone",

  // Supprime le header X-Powered-By: Next.js
  poweredByHeader: false,

  // Injecte les headers de sécurité sur toutes les routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Redirige les anciennes URLs /futsal vers /foot-a-5 (liens, QR codes, favoris)
  async redirects() {
    return [
      { source: "/futsal", destination: "/foot-a-5", permanent: true },
      { source: "/futsal/:path*", destination: "/foot-a-5/:path*", permanent: true },
    ];
  },
};

module.exports = nextConfig;
