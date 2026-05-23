#!/usr/bin/env sh
set -eu

mkdir -p /var/data

if [ ! -f /var/data/database.sqlite ]; then
  touch /var/data/database.sqlite
fi

php artisan config:clear || true
php artisan cache:clear || true

php artisan migrate --force

exec php -S 0.0.0.0:${PORT:-8000} -t public public/index.php

