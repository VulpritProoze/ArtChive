#!/bin/sh
set -e

python manage.py migrate

python manage.py loaddata common/fixtures/trophy_types.json
python manage.py loaddata common/fixtures/award_types.json

# Try to start server
python manage.py runserver 0.0.0.0:8000 || {
    echo "Django server exited — keeping container alive for debugging"
    tail -f /dev/null
}