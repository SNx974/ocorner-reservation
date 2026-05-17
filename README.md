# 🎡⚽ Marmaille Parc + Foot — Réservation en ligne

Application web complète de réservation pour parc de loisirs avec paiement hybride (en ligne via Stripe + sur place).

---

## 🚀 Installation rapide

### 1. Prérequis

- **Node.js** 18+ → [nodejs.org](https://nodejs.org)
- **npm** ou **yarn**

### 2. Installation

```bash
# Cloner / télécharger le projet
cd marmaille-parc-booking

# Installer les dépendances
npm install

# Copier la configuration
cp .env.example .env.local
```

### 3. Configuration `.env.local`

Éditez `.env.local` et renseignez :
- `STRIPE_SECRET_KEY` et `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Stripe)
- `STRIPE_WEBHOOK_SECRET` (Stripe Webhooks)
- `RESEND_API_KEY` (emails — optionnel)
- `ADMIN_SECRET` (token admin — changez !)
- `ADMIN_PASSWORD` (mot de passe admin)

### 4. Base de données

```bash
# Générer le client Prisma
npm run db:generate

# Créer les tables
npm run db:push

# Remplir avec les données initiales (formules, créneaux, paramètres)
npm run db:seed
```

### 5. Lancer en développement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) — réservation client  
Ouvrez [http://localhost:3000/admin](http://localhost:3000/admin) — panneau admin

---

## 📋 Fonctionnalités

### 👤 Client (public)

| Fonctionnalité | Détail |
|---|---|
| Choix formule | Cartes modernes avec filtres par catégorie |
| Date & créneau | Sélecteur date + boutons créneaux |
| Nombre d'enfants | Compteur avec validation minimum |
| Paiement en ligne | Stripe — confirmation immédiate |
| Paiement sur place | Acompte online ou physique — délai 72h |
| QR Code | Généré automatiquement à la réservation |
| Email confirmation | Envoyé automatiquement via Resend |

### 🧑‍💼 Admin (`/admin`)

| Page | Fonctionnalité |
|---|---|
| Dashboard | Stats du jour/semaine, alertes acomptes, réservations du jour |
| Réservations | Filtres statut/date, actions confirmer/annuler/acompte reçu |
| Paramètres | Prix formules, acompte %, délai, créneaux, mot de passe |

---

## 🏷️ Formules & tarifs

| Formule | Prix/enfant | Minimum |
|---|---|---|
| Marmaille + Boisson | 13€ | 6 |
| Marmaille + Crêpe | 15€ | 6 |
| Marmaille + Déjeuner | 20€ | 6 |
| Marmaille + Foot + Boisson | 22€ | 10 |
| Marmaille + Foot + Crêpe | 25€ | 10 |
| Marmaille + Foot + Déjeuner | 30€ | 10 |
| Foot + Boisson | 25€ | 10 |
| Foot + Crêpe | 28€ | 10 |
| Foot + Déjeuner | 33€ | 10 |

---

## 💳 Stripe — Configuration

### Développement (test)

1. Créez un compte sur [stripe.com](https://stripe.com)
2. Copiez les clés **test** dans `.env.local`
3. Pour tester les webhooks localement :

```bash
# Installer Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copiez le webhook secret affiché dans STRIPE_WEBHOOK_SECRET
```

Carte de test : `4242 4242 4242 4242` — exp: `12/34` — CVC: `123`

### Production

1. Activez votre compte Stripe
2. Remplacez les clés test par les clés **live**
3. Configurez un webhook dans le dashboard Stripe :
   - URL : `https://votre-domaine.com/api/webhooks/stripe`
   - Événements : `payment_intent.succeeded`, `payment_intent.payment_failed`

---

## 🗄️ Base de données

SQLite (dev) → PostgreSQL (prod recommandé)

Pour passer à PostgreSQL :
```env
DATABASE_URL="postgresql://user:password@host:5432/marmaille_parc"
```

```bash
npm run db:migrate
npm run db:seed
```

---

## 🌐 Déploiement (Vercel — recommandé)

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Configurer les variables d'environnement dans le dashboard Vercel
# puis : vercel --prod
```

Utilisez **Vercel Postgres** ou **Supabase** pour la base de données en production.

---

## 📁 Structure du projet

```
├── app/
│   ├── page.tsx                 # Page réservation (client)
│   ├── admin/                   # Panneau administration
│   │   ├── layout.tsx           # Sidebar + auth
│   │   ├── page.tsx             # Dashboard
│   │   ├── reservations/        # Gestion réservations
│   │   └── settings/            # Paramètres
│   └── api/
│       ├── formulas/            # GET formules
│       ├── timeslots/           # GET créneaux
│       ├── reservations/        # POST/GET réservations
│       ├── webhooks/stripe/     # Webhook Stripe
│       └── admin/               # API admin (auth requise)
├── components/
│   ├── booking/                 # Composants de réservation
│   └── ui/                      # Composants UI (Button, Card, etc.)
├── lib/
│   ├── prisma.ts                # Client Prisma
│   ├── stripe.ts                # Client Stripe
│   ├── email.ts                 # Templates emails (Resend)
│   └── utils.ts                 # Utilitaires
└── prisma/
    ├── schema.prisma            # Schéma base de données
    └── seed.ts                  # Données initiales
```

---

## 🔐 Sécurité

- Auth admin par token (header `x-admin-token`)
- Webhooks Stripe signés et vérifiés
- Validation côté serveur avec Zod
- Expiration automatique des réservations non confirmées

---

## 📞 Support

Pour toute question technique, consultez :
- [Next.js docs](https://nextjs.org/docs)
- [Prisma docs](https://www.prisma.io/docs)
- [Stripe docs](https://stripe.com/docs)
