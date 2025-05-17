-- First create the extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for Customer.name field with gin_trgm_ops
CREATE INDEX IF NOT EXISTS "customer_name_gin_idx" ON "Customer" USING gin (name gin_trgm_ops);

-- Create GIN index for Shipment.awb field with gin_trgm_ops
CREATE INDEX IF NOT EXISTS "shipment_awb_search_idx" ON "Shipment" USING gin (awb gin_trgm_ops); 