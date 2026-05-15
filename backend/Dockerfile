FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    fastapi>=0.115.0 \
    uvicorn>=0.30.0 \
    mcp>=1.0.0 \
    openai>=1.40.0 \
    openpyxl>=3.1.0 \
    pydantic>=2.0.0 \
    python-multipart>=0.0.9

COPY app/ app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
