# Lorrigo Monorepo

A modern monorepo using Turborepo for applications and packages.

## What's included

- `apps/web`: [Next.js](https://nextjs.org/) app
- `apps/api`: [Fastify](https://fastify.io/) API server
- `apps/workers`: Worker service for background jobs
- `packages/ui`: UI components shared between applications
- `packages/db`: Database client (Prisma) and schema
- `packages/eslint-config`: ESLint configurations
- `packages/typescript-config`: TypeScript configurations

## Getting Started

### Prerequisites

- Node.js 20+
- PNPM 10+
- Docker & Docker Compose (for containerized setup)

### Development

1. Install dependencies:

```bash
pnpm install
```

2. Copy the example environment file:

```bash
cp .example.env .env
```

3. Update the `.env` file with your configuration.

4. Start the development servers:

```bash
pnpm dev
```

This will start all applications in development mode.

### Running Tests

```bash
pnpm test
```

### Building for Production

```bash
pnpm build
```

## Docker Setup

### Building Individual Containers

```bash
# Build API container
docker build -t lorrigo-api -f apps/api/Dockerfile .

# Build Web container
docker build -t lorrigo-web -f apps/web/Dockerfile .

# Build Workers container
docker build -t lorrigo-workers -f apps/workers/Dockerfile .
```

### Using Docker Compose

Start all services with Docker Compose:

```bash
docker-compose up -d
```

This will start the following services:
- Web application (Next.js) on port 3000
- API server (Fastify) on port 3001
- Workers (background jobs)
- PostgreSQL database on port 5432

## CI/CD Pipeline

The CI/CD pipeline is set up with GitHub Actions and includes:

1. **Lint**: Code quality checks
2. **Test**: Run all test suites
3. **Build**: Build all applications
4. **Deploy**: Push Docker images and deploy (on main branch only)

### Environment Variables for CI/CD

These must be set in your GitHub repository secrets:

- `DOCKER_HUB_USERNAME`: Your Docker Hub username
- `DOCKER_HUB_ACCESS_TOKEN`: Your Docker Hub access token

## Project Structure

```
.
├── apps
│   ├── api         # Fastify API server
│   ├── web         # Next.js web application
│   └── workers     # Background job workers
├── packages
│   ├── db          # Database client and schema
│   ├── ui          # Shared UI components
│   ├── eslint-config
│   └── typescript-config
├── docker-compose.yml
├── .github
│   └── workflows
│       └── ci.yml  # CI/CD configuration
└── README.md
```

## License

This project is licensed under the ISC License.
