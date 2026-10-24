#!/bin/sh
# Vercel build: the repo targets SQLite for dev/tests; production uses Postgres (Neon).
set -e
case "$DATABASE_URL" in
  postgres://*|postgresql://*) ;;
  *) echo "DATABASE_URL must be a Postgres URL on Vercel" >&2; exit 1 ;;
esac
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
DATABASE_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}" npx prisma db push --skip-generate
npx prisma generate
npx next build
