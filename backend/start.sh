#!/bin/sh
set -e

# python manage.py makemigrations # remove in prod
# python manage.py migrate        # remove in prod

# python manage.py loaddata common/fixtures/trophy_types.json
# python manage.py loaddata common/fixtures/award_types.json
# python manage.py loaddata common/fixtures/default_collectives.json
# python manage.py create_initial_data

#Try to start server
python manage.py runserver 0.0.0.0:8000 || {
    echo "Django server exited — keeping container alive for debugging"
    tail -f /dev/null
}
