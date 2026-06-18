-- Run once on production to add the Event table + Reservation.eventId.
-- NOTE: scripts/start.sh runs `prisma db push` on every deploy, so this is
-- normally applied automatically. Provided as a manual fallback.
CREATE TABLE IF NOT EXISTS "Event" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "slug"        TEXT NOT NULL UNIQUE,
  "title"       TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "price"       DOUBLE PRECISION NOT NULL,
  "priceNote"   TEXT,
  "eventDate"   TIMESTAMP(3) NOT NULL,
  "capacity"    INTEGER,
  "imageUrl"    TEXT,
  "accentColor" TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);

ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "eventId" TEXT;
DO $$ BEGIN
  ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
