# Lorrigo Logistics Platform

A comprehensive logistics platform for managing orders, shipments, customers, and couriers.

## Features

### User Features

- Wallet and Non-wallet payment gateway
- Customer management (CRUD)
- Hub management (CRUD)
- Order creation and management (CRUD)
- Shipment creation
- Courier selection
- Remittance management
- Invoicing
- Dispute handling
- Billing
- Notifications (System, WhatsApp, Email)
- Bulk operations (Orders, Shipments)
- Analytics

### Admin Features

- View each seller's orders and shipments
- Billing management for AWBs
- Accept/reject disputes
- Manage courier visibility to sellers
- Custom pricing for couriers based on seller
- User sidebar permission management
- Bulk courier pricing updates (Globally, new logins, existing users)
- Control notification access
- CSV upload with header mapping
- Remittance cycle management

### Technical Features

- Authentication using Auth.js
- Rate-limiting with Fastify/rate-limit + Redis
- Notification service
- API Documentation with Swagger
- Error tracking with Sentry
- Logging (API hits, rate-limit, IP address, seller ID)
- Realtime tracking
- Code security
- Background job processing with BullMQ + Redis
- Cron jobs for in-transit shipment processing
- Email and WhatsApp notifications
- Large data processing (bulk shipping)
- CSV report generation
- Remittance and billing reports

## Tech Stack

- **Backend**: Node.js, Fastify, TypeScript
- **Frontend**: Next.js, React, TypeScript
- **Database**: PostgreSQL
- **Caching & Queues**: Redis, BullMQ
- **ORM**: Prisma
- **Authentication**: Auth.js, JWT
- **API Documentation**: Swagger
- **Error Tracking**: Sentry
- **Containerization**: Docker

## Project Structure

The project is organized as a monorepo using Turborepo with the following structure:

```
lorrigo-v2/
├── apps/                  # Application code
│   ├── api/               # Backend API
│   ├── web/               # Frontend application
│   ├── notifications/     # Notification service
│   └── workers/           # Background job workers
├── packages/              # Shared code packages
│   ├── db/                # Database access and Prisma schema
│   ├── common/            # Shared utilities, validations, and types
│   └── ui/                # Shared UI components
├── docker/                # Docker configuration
└── turbo.json             # Turborepo configuration
```

## Module-based Architecture

The API follows a module-based architecture where each domain concept (e.g., orders, shipments, customers) is encapsulated in its own module with the following structure:

```
modules/
├── orders/                # Orders module
│   ├── controllers/       # HTTP request handlers
│   ├── services/          # Business logic
│   ├── validations/       # Input validation schemas
│   └── index.ts           # Module routes definition
├── shipments/             # Shipments module
├── customers/             # Customers module
└── ...                    # Other domain modules
```

### Key architectural patterns:

1. **Validation Separation**: Validation schemas are defined in `packages/common/validations` and reused across the application.
2. **Service Layer**: Business logic is implemented in service classes, separated from controllers.
3. **Controller Layer**: Handles HTTP specifics, validation, and error handling.
4. **Route Definition**: Routes are defined in module index files for better organization.

## Getting Started

### Prerequisites

- Node.js 16+
- pnpm
- Docker
- PostgreSQL

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/lorrigo-v2.git
   cd lorrigo-v2
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables by copying the example files:

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp packages/db/.env.example packages/db/.env
   ```

4. Start the development environment with Docker:

   ```bash
   docker-compose up -d
   ```

5. Run database migrations:

   ```bash
   pnpm --filter @lorrigo/db migrate:dev
   ```

6. Run the development server:
   ```bash
   pnpm dev
   ```

## Module Development

When developing a new feature or module:

1. Identify the domain concept it belongs to
2. Create appropriate directory structure in the relevant module
3. Define validation schemas in common package if needed
4. Implement business logic in service classes
5. Implement HTTP handlers in controller classes
6. Define routes in the module index file
7. Register the module in `apps/api/src/index.ts`

## API Endpoints

Documentation for API endpoints is available through Swagger at `/api/docs` when running the API server.

## Background Jobs

Background processing is handled by BullMQ with job queues for:

- Notifications
- Shipment tracking updates
- Invoice generation
- Data exports
- Report generation

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add some amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## License

This project is proprietary and confidential.
