FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    YOLO_CONFIG_DIR=/tmp/Ultralytics

WORKDIR /app

COPY backend/requirements-hf.txt /app/backend/requirements-hf.txt
RUN pip install --upgrade pip && pip install -r /app/backend/requirements-hf.txt

COPY backend /app/backend

EXPOSE 7860
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
