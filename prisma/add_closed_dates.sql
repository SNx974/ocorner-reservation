-- Run once on production to add the ClosedDate table
CREATE TABLE IF NOT EXISTS "ClosedDate" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "date"      TIMESTAMP(3) NOT NULL,
  "label"     TEXT,
  "type"      TEXT NOT NULL DEFAULT 'all',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
