# ── Build stage ─────────────────────────────────────────────
FROM node:20-alpine AS builder

# Native deps needed to compile sqlite3 (required by npm ci even when using Postgres)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install backend deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Install frontend deps & build
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# ── Production stage ───────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy backend deps from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy backend source
COPY package.json ./
COPY server.js ./
COPY src/ ./src/

# Copy built frontend
COPY --from=builder /app/client/dist ./client/dist

# Default env vars (override in Coolify)
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
