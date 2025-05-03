FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY apps/workers/package.json .
RUN npm install

# Copy source code
COPY apps/workers/src ./src
COPY apps/workers/tsconfig.json .

# Build TypeScript
RUN npm run build

# Set environment variables
ENV NODE_ENV=production

# Start the workers
CMD ["node", "dist/index.js"] 