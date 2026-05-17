import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed formulas
  const formulas = [
    // Marmaille Parc
    { name: "Marmaille + Boisson", category: "marmaille", includes: "boisson", pricePerChild: 13, minChildren: 6 },
    { name: "Marmaille + Crêpe", category: "marmaille", includes: "crepe", pricePerChild: 15, minChildren: 6 },
    { name: "Marmaille + Déjeuner", category: "marmaille", includes: "dejeuner", pricePerChild: 20, minChildren: 6 },
    // Marmaille + Foot
    { name: "Marmaille + Foot + Boisson", category: "marmaille_foot", includes: "boisson", pricePerChild: 22, minChildren: 10 },
    { name: "Marmaille + Foot + Crêpe", category: "marmaille_foot", includes: "crepe", pricePerChild: 25, minChildren: 10 },
    { name: "Marmaille + Foot + Déjeuner", category: "marmaille_foot", includes: "dejeuner", pricePerChild: 30, minChildren: 10 },
    // Foot
    { name: "Foot + Boisson", category: "foot", includes: "boisson", pricePerChild: 25, minChildren: 10 },
    { name: "Foot + Crêpe", category: "foot", includes: "crepe", pricePerChild: 28, minChildren: 10 },
    { name: "Foot + Déjeuner", category: "foot", includes: "dejeuner", pricePerChild: 33, minChildren: 10 },
  ];

  for (const f of formulas) {
    await prisma.formula.upsert({
      where: { id: f.name },
      update: f,
      create: { ...f, id: f.name.toLowerCase().replace(/\s+/g, "_").replace(/[+]/g, "").replace(/é/g, "e").replace(/ê/g, "e") },
    });
  }

  // Seed time slots (3 plages)
  const slots = [
    { id: "slot_matin", time: "09:00-12:00" },
    { id: "slot_aprem", time: "12:30-15:30" },
    { id: "slot_soir",  time: "16:00-19:00" },
  ];
  for (const s of slots) {
    await prisma.timeSlot.upsert({
      where: { id: s.id },
      update: { time: s.time },
      create: s,
    });
  }

  // Seed settings
  const settings = [
    { key: "deposit_percentage", value: "30" },
    { key: "deposit_min_amount", value: "50" },
    { key: "booking_expiry_hours", value: "72" },
    { key: "admin_password", value: "admin2024" },
    { key: "park_name", value: "Marmaille Parc + Foot" },
    { key: "park_phone", value: "0262 XX XX XX" },
    { key: "park_email", value: "contact@marmailleparc.re" },
    { key: "stripe_enabled", value: "true" },
    { key: "max_per_slot", value: "5" },
  ];

  for (const s of settings) {
    await prisma.settings.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  console.log("✅ Database seeded successfully");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
