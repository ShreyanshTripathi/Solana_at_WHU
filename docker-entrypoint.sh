#!/bin/sh
# Restores an uploaded data bundle (database, devnet keys, public-code secret) before the app opens
# the database: upload it as /data/restore.tgz and restart the machine.
set -e
mkdir -p /data
if [ -f /data/restore.tgz ]; then
  echo "Restoring /data from restore.tgz"
  rm -f /data/kiezwatt.db /data/kiezwatt.db-wal /data/kiezwatt.db-shm
  tar xzf /data/restore.tgz -C /data
  rm /data/restore.tgz
fi
exec "$@"
