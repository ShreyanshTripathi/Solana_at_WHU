#!/bin/sh
# Packs what the deployed app needs from data/ (database, devnet keys, devnet.json, public-code
# secret) into a bundle to upload as /data/restore.tgz. Writes it outside the project so it never
# ends up in git:   sh scripts/pack-data.sh   ->   ../volty-data.tgz
# The product copy:  DB=prod sh scripts/pack-data.sh ../volty-prod-data.tgz   (packs data/prod.db)
set -e
cd "$(dirname "$0")/.."
OUT="${1:-../volty-data.tgz}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
DB="${DB:-kiezwatt}"
sqlite3 "data/$DB.db" ".backup '$TMP/$DB.db'" # a consistent copy, WAL included
cp -R data/keys data/devnet.json data/public-code-secret "$TMP/"
tar czf "$OUT" -C "$TMP" .
echo "Wrote $OUT"
