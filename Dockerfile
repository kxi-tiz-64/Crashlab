FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG REACT_APP_API_URL=""
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
RUN npm run build

FROM python:3.11-slim AS runtime
WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt gunicorn
COPY backend/ /app/backend/
COPY --from=frontend-builder /app/frontend/build /app/frontend/build
ENV FLASK_ENV=production
ENV PORT=5000
EXPOSE 5000
WORKDIR /app/backend
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
