FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Set DATABASE_URL as an ARG
ARG DATABASE_URL

# Copy package configs
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* turbo.json ./

# Copy packages for the workspace
COPY ./packages ./packages

# Copy the web app
COPY ./apps/web ./apps/web

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate database client/types
RUN pnpm run db:generate

# Build the web app with the DATABASE_URL environment variable
RUN DATABASE_URL=${DATABASE_URL} pnpm run build

EXPOSE 3000

CMD ["pnpm", "run", "start:web"]