FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Copy package configs
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* turbo.json ./

# Copy packages for the workspace
COPY ./packages ./packages

# Copy the backend app
COPY ./apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate database client/types
RUN pnpm run db:generate

EXPOSE 8080

CMD ["node", "dist/index.js"] 