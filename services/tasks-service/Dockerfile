FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
COPY services/tasks-service/package.json ./services/tasks-service/
COPY packages/types/package.json ./packages/types/
COPY packages/database/package.json ./packages/database/
ENV HUSKY=0
RUN npm ci --workspace=@tablero-pro/tasks-service --workspace=@tablero-pro/types --workspace=@tablero-pro/database

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=@tablero-pro/tasks-service

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser
COPY --from=builder /app/services/tasks-service/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
USER appuser
EXPOSE 4003
CMD ["node", "dist/index.js"]
