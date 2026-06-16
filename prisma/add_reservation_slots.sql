-- Run once on production to add the FutsalReservationSlot table (futsal cart / multi-slot booking)
-- NOTE: the production start.sh runs `prisma db push` on every deploy, so this table is
-- normally created automatically. This file is provided as a manual fallback.
CREATE TABLE IF NOT EXISTS "FutsalReservationSlot" (
  "id"               TEXT NOT NULL PRIMARY KEY,
  "reservationId"    TEXT NOT NULL,
  "futsalTimeSlotId" TEXT NOT NULL,
  "courtNumber"      INTEGER NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FutsalReservationSlot_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE,
  CONSTRAINT "FutsalReservationSlot_futsalTimeSlotId_fkey"
    FOREIGN KEY ("futsalTimeSlotId") REFERENCES "FutsalTimeSlot"("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FutsalReservationSlot_unique"
  ON "FutsalReservationSlot" ("reservationId", "futsalTimeSlotId", "courtNumber");
