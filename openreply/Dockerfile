FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# prisma generate does not need a live database
ENV DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/openreply" \
    NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate && npx next build

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
