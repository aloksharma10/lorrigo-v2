# Shopify Integration

This module provides comprehensive Shopify integration for the Lorrigo platform, including order synchronization and tracking updates.

## Features

### 1. Order Synchronization
- **Manual Sync**: Sync orders from Shopify via API endpoint
- **Automatic Sync**: Scheduled job to sync orders from all connected Shopify stores
- **Incremental Sync**: Only sync orders from the last 24 hours to avoid rate limits

### 2. Tracking Updates
- **Automatic Tracking**: When a courier is assigned to a Shopify order, tracking information is automatically sent to Shopify
- **Fulfillment Creation**: Creates fulfillment in Shopify with tracking number and URL
- **Tag Management**: Adds relevant tags to Shopify orders (e.g., "Tracking Sent", "Courier Assigned")

## API Endpoints

### Authentication
- `GET /shopify/auth/url` - Get Shopify OAuth URL
- `GET /shopify/auth` - Initiate OAuth flow (legacy)
- `GET /shopify/callback` - Handle OAuth callback
- `GET /shopify/connection` - Get connection status
- `DELETE /shopify/connection` - Disconnect Shopify

### Orders
- `GET /shopify/orders` - Get orders from Shopify
- `GET /shopify/orders/:id` - Get specific order from Shopify
- `POST /shopify/sync-orders` - Manually sync orders from Shopify

### Webhooks (GDPR Compliance)
- `POST /shopify/webhooks/customers/data_request` - Handle customer data requests
- `POST /shopify/webhooks/customers/redact` - Handle customer data erasure
- `POST /shopify/webhooks/shop/redact` - Handle shop data erasure

## Usage

### Manual Order Sync
```bash
# Sync orders for the last 24 hours
curl -X POST "http://localhost:8000/shopify/sync-orders?created_at_min=2024-01-01T00:00:00Z&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Run Sync Job
```bash
# Run the sync job manually
npm run shopify:sync
```

### Programmatic Usage
```typescript
import { ShopifySyncService } from './shopify-sync-service';

const syncService = new ShopifySyncService(fastify);

// Sync orders for a user
const result = await syncService.syncOrdersFromShopify(userId, {
  created_at_min: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  limit: 50
});

// Send tracking to Shopify
const trackingResult = await syncService.sendTrackingToShopify(
  orderId,
  'AWB123456789',
  'https://app.lorrigo.com/tracking/AWB123456789',
  ['Tracking Sent', 'Courier Assigned']
);
```

## Configuration

### Environment Variables
- `SHOPIFY_API_KEY` - Shopify app API key
- `SHOPIFY_API_SECRET` - Shopify app API secret
- `SHOPIFY_REDIRECT_URI` - OAuth redirect URI
- `SHOPIFY_API_VERSION` - Shopify API version (e.g., "2023-10")

### Database Schema
The integration uses the following database tables:
- `shopifyConnection` - Stores Shopify OAuth connections
- `orderChannelConfig` - Links orders to their source channel
- `order` - Main order table with channel information

## Flow

### Order Sync Flow
1. User connects their Shopify store via OAuth
2. Orders are synced from Shopify to local database
3. Orders are processed through the normal Lorrigo workflow

### Tracking Update Flow
1. User assigns a courier to a Shopify order
2. Shipment is created with AWB/tracking number
3. Tracking information is automatically sent to Shopify
4. Fulfillment is created in Shopify with tracking details
5. Relevant tags are added to the Shopify order

## Error Handling

- **Rate Limiting**: Built-in delays between API calls to respect Shopify rate limits
- **Connection Errors**: Graceful handling of network issues
- **Authentication Errors**: Automatic token refresh and re-authentication
- **Partial Failures**: Individual order failures don't stop the entire sync process

## Monitoring

- **Logging**: Comprehensive logging for all operations
- **Error Tracking**: Integration with Sentry for error monitoring
- **Metrics**: Track sync success rates and performance

## Security

- **OAuth 2.0**: Secure authentication with Shopify
- **Token Storage**: Encrypted storage of access tokens
- **GDPR Compliance**: Full support for data request and erasure webhooks
- **Rate Limiting**: Respects Shopify API rate limits

## Troubleshooting

### Common Issues

1. **"No access token available"**
   - Check if the Shopify connection is active
   - Re-authenticate the user with Shopify

2. **"Order not found in Shopify"**
   - Verify the Shopify order ID is correct
   - Check if the order exists in the connected Shopify store

3. **"Failed to create fulfillment"**
   - Verify the shop has a primary location set
   - Check if the order is in a fulfillable state

### Debug Mode
Enable debug logging by setting the log level to debug in your environment configuration. 