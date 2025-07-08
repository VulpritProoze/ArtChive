#!/bin/sh
set -e

python manage.py migrate

# Try to start server
python manage.py runserver 0.0.0.0:8000 || {
    echo "Django server exited — keeping container alive for debugging"
    tail -f /dev/null
}