# ── Build stage ─────────────────────────────────────────────
FROM node:20-alpine AS builder

# Native deps needed to compile some packages
RUN apk add --no-cache python3 make g++

# Force development mode so npm ci installs devDependencies (vite, tailwind, etc.)
ENV NODE_ENV=development

WORKDIR /app

# Install ALL backend deps (including dev for build)
COPY package.json package-lock.json* ./
RUN npm ci

# Install frontend deps & build
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# ── Production stage ───────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install ONLY production deps (no sqlite3 since it's devDependency now)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy backend source
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
