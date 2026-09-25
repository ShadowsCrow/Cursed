FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY .workspace/requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

EXPOSE 8501

WORKDIR /app/app_streamlit

CMD ["streamlit", "run", "app/ficha.py", "--server.address=0.0.0.0", "--server.port=8501"]
