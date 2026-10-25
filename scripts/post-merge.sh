#!/bin/bash
set -e
npm install
# The dev push: VARGEN_DB_TARGET=dev, so this only ever reaches DEV_DATABASE_URL.
# Production is migrated by the deployment build (db:push:prod), never from here.
npm run db:push
