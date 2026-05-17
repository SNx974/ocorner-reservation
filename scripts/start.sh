#!/bin/sh
set -e

echo "Syncing database schema..."
npx prisma db push --skip-generate

echo "Seeding initial data..."
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function seed() {
  // Time slots anniversaire
  const bdaySlots = ['09:00-12:00','12:30-15:30','16:00-19:00'];
  for (const time of bdaySlots) {
    await p.timeSlot.upsert({ where: { id: 'bday_'+time.replace(/[^0-9]/g,'') }, create: { id: 'bday_'+time.replace(/[^0-9]/g,''), time }, update: {} });
  }
  // Birthday formulas
  const formulas = [
    { id: 'f_marmaille_boisson',   name: 'Marmaille + Boisson',   category: 'marmaille',      includes: 'Boisson incluse',           pricePerChild: 13, minChildren: 6 },
    { id: 'f_marmaille_crepe',     name: 'Marmaille + Crêpe',     category: 'marmaille',      includes: 'Crêpe incluse',             pricePerChild: 15, minChildren: 6 },
    { id: 'f_marmaille_dejeuner',  name: 'Marmaille + Déjeuner',  category: 'marmaille',      includes: 'Déjeuner inclus',           pricePerChild: 20, minChildren: 6 },
    { id: 'f_mf_boisson',          name: 'Marmaille + Foot + Boisson',  category: 'marmaille_foot', includes: 'Parc + Foot + Boisson', pricePerChild: 22, minChildren: 10 },
    { id: 'f_mf_crepe',            name: 'Marmaille + Foot + Crêpe',    category: 'marmaille_foot', includes: 'Parc + Foot + Crêpe',  pricePerChild: 25, minChildren: 10 },
    { id: 'f_mf_dejeuner',         name: 'Marmaille + Foot + Déjeuner', category: 'marmaille_foot', includes: 'Parc + Foot + Déjeuner', pricePerChild: 30, minChildren: 10 },
    { id: 'f_foot_boisson',        name: 'Foot + Boisson',        category: 'foot',           includes: 'Foot + Boisson',            pricePerChild: 25, minChildren: 10 },
    { id: 'f_foot_crepe',          name: 'Foot + Crêpe',          category: 'foot',           includes: 'Foot + Crêpe',              pricePerChild: 28, minChildren: 10 },
    { id: 'f_foot_dejeuner',       name: 'Foot + Déjeuner',       category: 'foot',           includes: 'Foot + Déjeuner',           pricePerChild: 33, minChildren: 10 },
  ];
  for (const f of formulas) {
    await p.formula.upsert({ where: { id: f.id }, create: { ...f, isActive: true }, update: {} });
  }
  // Futsal slots 10h-22h
  for (let h = 10; h <= 22; h++) {
    await p.futsalTimeSlot.upsert({ where: { id: 'futsal_hour_'+h }, create: { id: 'futsal_hour_'+h, hour: h, isActive: true }, update: {} });
  }
  // Settings
  const settings = [
    { key: 'deposit_percentage', value: '30' },
    { key: 'deposit_min_amount', value: '50' },
    { key: 'booking_expiry_hours', value: '72' },
    { key: 'birthday_max_per_slot', value: '6' },
    { key: 'futsal_price_per_player', value: '8' },
    { key: 'futsal_max_courts', value: '3' },
    { key: 'futsal_min_players', value: '10' },
    { key: 'futsal_deposit_percentage', value: '30' },
    { key: 'futsal_deposit_min_amount', value: '30' },
  ];
  for (const s of settings) {
    await p.settings.upsert({ where: { key: s.key }, create: s, update: {} });
  }
  console.log('Seed OK');
}
seed().finally(() => p.\$disconnect());
"

echo "Starting Next.js..."
exec node server.js
