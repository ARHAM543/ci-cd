# Stage 1: Build Frontend
FROM node:20 AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Serve Backend & Frontend
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Copy compiled static files from Stage 1
COPY --from=frontend-builder /frontend/dist ./frontend/dist

CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000"]
