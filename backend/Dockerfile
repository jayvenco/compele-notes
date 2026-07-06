FROM node:20-alpine

WORKDIR /app

# better-sqlite3 needs build tools to compile its native binding
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

ENV DATA_DIR=/app/data
ENV UPLOADS_DIR=/app/uploads
ENV PORT=4000

RUN mkdir -p /app/data /app/uploads

EXPOSE 4000

CMD ["node", "src/index.js"]
