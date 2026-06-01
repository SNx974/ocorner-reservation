-- Run once on production to add the ClosedDate and VacationPeriod tables
CREATE TABLE IF NOT EXISTS "ClosedDate" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "date"      TIMESTAMP(3) NOT NULL,
  "label"     TEXT,
  "type"      TEXT NOT NULL DEFAULT 'all',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "VacationPeriod" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "label"     TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate"   TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
