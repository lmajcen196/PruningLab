FROM pytorch/pytorch:2.5.1-cuda12.1-cudnn9-runtime

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    TRANSFORMERS_CACHE=/root/.cache/huggingface \
    HF_HOME=/root/.cache/huggingface \
    USE_4BIT=1

COPY requirements.txt .
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
