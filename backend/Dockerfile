FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY pyproject.toml ./
RUN pip install --no-cache-dir -e ".[test]"

# Copy application code
COPY app/ app/

# Create data directory for plan.json
RUN mkdir -p /app/data && chmod 777 /app/data
ENV DATA_DIR=/app/data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
