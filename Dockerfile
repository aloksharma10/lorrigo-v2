FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@10.4.1

# Setup workspace
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/utils/package.json ./packages/utils/package.json

RUN pnpm install

# Copy source for all apps and packages
FROM deps AS builder
COPY . .

# Build all packages
RUN pnpm build

# Production stage
FROM base AS runner
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./

# The final image will be used as a base for service-specific Dockerfiles 