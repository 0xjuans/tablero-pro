FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
COPY services/notifications-service/package.json ./services/notifications-service/
COPY packages/types/package.json ./packages/types/
COPY packages/database/package.json ./packages/database/
COPY packages/database/prisma ./packages/database/prisma
RUN npm ci --ignore-scripts --workspace=@tablero-pro/notifications-service --workspace=@tablero-pro/types --workspace=@tablero-pro/database
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=@tablero-pro/notifications-service

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser
COPY --from=builder /app/services/notifications-service/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
USER appuser
EXPOSE 4004
CMD ["node", "dist/index.js"]
