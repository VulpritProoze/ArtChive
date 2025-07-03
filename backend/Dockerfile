FROM python:3.12-slim

# dir in container
WORKDIR /backend

ENV PYTHONBUFFERED=1 \
    PYTHONDEFAULTHANDLER=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=off

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY ./backend/requirements.txt /backend

# Add --no-cache-dir for production
RUN pip install -r requirements.txt

# copy all /backend local to /backend container
COPY backend /backend

EXPOSE 8000

# wait for postgresql instance to finish before running backend
CMD ["sh", "-c", "./wait-for-it.sh db:5432 && python manage.py runserver 0.0.0.0:8000"]

# build with docker build -t artchive_backend .
# run with docker run -d -p 8000:8000 --name dev artchive_backend