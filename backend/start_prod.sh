#!/bin/sh
set -e

# Ensure static files and migrations are up to date before serving traffic
python manage.py collectstatic --noinput
python manage.py migrate --noinput

# Provision the admin account and fixtures using env-configured credentials (idempotent)
python manage.py loaddata common/fixtures/trophy_types.json
# python manage.py loaddata common/fixtures/award_types.json
python manage.py loaddata common/fixtures/default_collectives.json
python manage.py create_initial_data

# Launch the ASGI server (Daphne) for HTTP + WebSocket support
exec daphne \
    --bind 0.0.0.0 \
    --port ${PORT:-8000} \
    ${ASGI_APP:-artchive.asgi:application}

