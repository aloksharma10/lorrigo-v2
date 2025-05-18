# Database Migration Guide

This directory contains SQL scripts and utilities for database migrations that aren't handled by Prisma's standard migration process.

## GIN Indexes for Text Search

The `gin_indexes.sql` file contains SQL commands to set up GIN indexes with the `pg_trgm` extension for effective text search. These indexes are used for:

- Fuzzy searching of Customer names (`Customer.name`)
- Searching shipments by AWB number (`Shipment.awb`)

## How to Apply

You can apply these indexes by running:

```bash
npm run db:gin-indexes
```

Or as part of the database setup process:

```bash
npm run db:setup
```

This will:

1. Push the schema to the database
2. Apply the custom GIN indexes

## Troubleshooting

If you encounter `operator class "gin_trgm_ops" does not exist` errors, it means the `pg_trgm` extension is not installed or enabled in your PostgreSQL database. The script attempts to create the extension, but you may need administrator privileges for this operation.
