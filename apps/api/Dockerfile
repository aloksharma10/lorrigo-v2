FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY apps/api/package.json .
RUN npm install

# Copy source code
COPY apps/api/src ./src
COPY apps/api/tsconfig.json .

# Build TypeScript
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the API port
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"] 