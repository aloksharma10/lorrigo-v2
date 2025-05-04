FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

# Set build arguments
ARG DATABASE_URL
ARG NEXT_PUBLIC_API_URL

# Set environment variables
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

WORKDIR /usr/src/app

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

# Build the UI components first
RUN cd packages/ui && pnpm run build

# Build the web app with environment variables
RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "run", "start:web"]