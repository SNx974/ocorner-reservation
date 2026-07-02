-- Run once on production to add a per-slot price to FutsalTimeSlot.
-- NOTE: scripts/start.sh runs `prisma db push` on every deploy, so this is
-- normally applied automatically. Provided as a manual fallback.
ALTER TABLE "FutsalTimeSlot" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION;
