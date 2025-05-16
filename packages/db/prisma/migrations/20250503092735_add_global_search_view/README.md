# Global Search View Migration

This migration implements a PostgreSQL view called `global_search` that provides a unified interface for searching across multiple tables in the database.

## Purpose

The view combines searchable fields from:
- `Order` (searchable by `orderNumber`)
- `Shipment` (searchable by `awb`)
- `User` (searchable by `email`)
- `Customer` (searchable by `phone`)

## Usage

You can query this view directly in SQL or through your application code to perform global searches:

```sql
-- Example: Search for a term across all tables
SELECT * FROM global_search WHERE search_key LIKE '%searchterm%';

-- Example: Search in a specific entity type
SELECT * FROM global_search WHERE type = 'ORDER' AND search_key LIKE '%ORD-%';
```

## Notes

- This view is automatically created when running the migration
- The view will be updated automatically when the schema changes, as long as the field names remain consistent
- For complex search requirements, consider implementing a full-text search solution 