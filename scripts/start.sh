#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma db push --skip-generate

echo "Starting Next.js..."
exec node server.js
