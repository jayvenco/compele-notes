# Stage 1: build frontend
FROM node:20-alpine AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: backend + frontend static files
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ .
COPY --from=frontend /build/dist ./public
EXPOSE 4000
CMD ["node", "src/index.js"]
