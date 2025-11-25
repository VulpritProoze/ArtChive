FROM python:3.12-slim


ENV PYTHONBUFFERED=1 \
    PYTHONDEFAULTHANDLER=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=off

# Run container as non-root user
RUN groupadd user && useradd --create-home --home-dir /home/user -g user user

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# dir in container
WORKDIR /app
    
COPY backend/requirements.txt .

# Add --no-cache-dir for production
RUN pip install -r requirements.txt

COPY backend/start.sh .

RUN chmod +x start.sh && \
    chown user:user start.sh

USER user   

EXPOSE 8000

CMD ["./start.sh"]

# build with docker build -t artchive_backend .
# run with docker run -d -p 8000:8000 --name dev artchive_backend
# docker exec -it artchive-backend-1 /bin/bash (run bash shell)