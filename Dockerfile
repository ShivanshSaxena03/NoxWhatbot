# Multi-stage production build for Jarvis WhatsApp AI Assistant

FROM node:20-alpine AS base
WORKDIR /app

# Step 1. Install dependencies
FROM base AS deps
RUN apk add --no-co-cache libc6-compat
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/security/package*.json ./packages/security/
COPY packages/database/package*.json ./packages/database/
COPY packages/ai/package*.json ./packages/ai/
COPY packages/reminders/package*.json ./packages/reminders/
COPY packages/whatsapp/package*.json ./packages/whatsapp/
COPY packages/workers/package*.json ./packages/workers/
COPY apps/web/package*.json ./apps/web/

RUN npm install

# Step 2. Build monorepo packages
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npm run db:generate

# Build all packages
RUN npm run build

# Step 3. Production Runner
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app ./

EXPOSE 3000 3001

CMD ["npm", "start"]
