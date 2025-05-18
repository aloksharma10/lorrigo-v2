# Database Package

This package contains the Prisma schema and migrations for the application's database.

## Global Search View

The database includes a `global_search` view that provides a unified interface for searching across multiple tables:

- `Order` (searchable by `orderNumber`)
- `Shipment` (searchable by `awb`)
- `User` (searchable by `email`)
- `Customer` (searchable by `phone`)

## Applying Migrations

### Using the Script

Run the migration script to apply all pending migrations including the global search view:

```bash
# On Linux/Mac
node scripts/apply-migrations.js

# On Windows
node scripts\apply-migrations.js
```

### Using Prisma CLI Directly

Alternatively, you can use the Prisma CLI directly:

```bash
npx prisma migrate deploy
```

## Using the Global Search View

Once migrations are applied, you can query the global search view:

```sql
-- Search across all tables
SELECT * FROM global_search WHERE search_key LIKE '%searchterm%';

-- Search in a specific entity type
SELECT * FROM global_search WHERE type = 'ORDER' AND search_key LIKE '%ORD-%';
```

## Development

When making schema changes, be aware that:

1. The global search view depends on specific table and column names
2. If you change these tables or columns, you'll need to update the view in a migration

To create a new migration for schema changes:

```bash
npx prisma migrate dev --name your_migration_name
```
