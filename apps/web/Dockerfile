FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Set and expose ARG and ENV
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Copy package configs
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* turbo.json ./

# Copy packages and apps
COPY ./packages ./packages
COPY ./apps/web ./apps/web

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client using env
RUN pnpm run db:generate

# Build the app (DATABASE_URL will be available)
RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "run", "start:web"]