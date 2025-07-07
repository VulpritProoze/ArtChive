#!/bin/sh

set -e

python manage.py migrate

python manage.py loaddata common/fixtures/post_types.json

exec python manage.py runserver 0.0.0.0:8000