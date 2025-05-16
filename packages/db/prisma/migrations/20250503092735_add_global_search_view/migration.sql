-- CreateView for global search across multiple tables
-- This view combines searchable fields from Order, Shipment, User, and Customer tables
-- to provide a unified interface for global searches

-- Drop the view if it exists
DROP VIEW IF EXISTS "global_search";

-- Create the view
CREATE VIEW global_search AS
SELECT 'ORDER' as type, id, code, "orderNumber" as search_key, "createdAt" FROM "Order"
UNION
SELECT 'SHIPMENT' as type, id, code, awb as search_key, "createdAt" FROM "Shipment"
UNION
SELECT 'USER' as type, id, code, email as search_key, "createdAt" FROM "User"
UNION
SELECT 'CUSTOMER' as type, id, code, phone as search_key, "createdAt" FROM "Customer"; 