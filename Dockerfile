# ============================================
# HasaPay Admin - Production Dockerfile
# (mirrors the dashboard image: Next.js standalone, served by node server.js)
# ============================================

FROM node:20-slim AS builder
WORKDIR /app

# Build dependencies for native modules
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files only
COPY package.json ./

# Fresh install (ignore lock file to get correct platform binaries)
RUN npm install

# Copy source code
COPY . .

# Environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ARG NEXT_PUBLIC_API_URL=https://api.hasapay.com
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build (requires output: 'standalone' in next.config.ts)
RUN npm run build

# Stage 2: Production runner
FROM node:20-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
