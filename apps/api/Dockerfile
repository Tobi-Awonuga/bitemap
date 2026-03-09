FROM node:20-alpine AS base
WORKDIR /app

# Copy workspace files
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN npm ci --workspace=apps/api --workspace=packages/shared

# Copy source
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared + api
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/api

# Production image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN npm ci --workspace=apps/api --workspace=packages/shared --omit=dev

COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY apps/api/drizzle ./apps/api/drizzle

EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
