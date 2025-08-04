# Shopify Webhooks Setup Guide

## Overview

This guide explains how to set up the mandatory Shopify webhooks required for listing your app on the Shopify App Store. These webhooks are essential for GDPR compliance and data privacy.

## Mandatory Compliance Webhooks

Your app must implement these three webhook endpoints to comply with Shopify's App Store requirements:

### 1. Customer Data Request Webhook
- **Topic**: `customers/data_request`
- **Endpoint**: `POST /api/channels/shopify/webhooks/customers/data_request`
- **Purpose**: Handles customer data export requests (GDPR Article 15)
- **Full URL**: `https://your-domain.com/api/channels/shopify/webhooks/customers/data_request`

### 2. Customer Data Erasure Webhook
- **Topic**: `customers/redact`
- **Endpoint**: `POST /api/channels/shopify/webhooks/customers/redact`
- **Purpose**: Handles customer data deletion requests (GDPR Article 17)
- **Full URL**: `https://your-domain.com/api/channels/shopify/webhooks/customers/redact`

### 3. Shop Data Erasure Webhook
- **Topic**: `shop/redact`
- **Endpoint**: `POST /api/channels/shopify/webhooks/shop/redact`
- **Purpose**: Handles shop data deletion requests when app is uninstalled
- **Full URL**: `https://your-domain.com/api/channels/shopify/webhooks/shop/redact`

## Implementation Requirements

### Webhook Security
- All webhooks are secured with HMAC-SHA256 verification using your Shopify app's API secret
- Invalid HMAC headers must return HTTP 401 Unauthorized status
- Webhook headers validation is implemented

### Response Requirements
- All webhooks must return HTTP 200 status code
- Response time should be under 5 seconds
- Always return success even if processing fails
- Must handle POST requests with JSON body and Content-Type: application/json

### Data Handling Timeline
- **Customer Data Request**: Must be completed within 30 days
- **Customer Data Erasure**: Must be completed within 30 days (unless legally required to retain)
- **Shop Data Erasure**: Must be completed within 30 days (sent 48 hours after app uninstallation)

## Configuration in Shopify Partner Dashboard

### Method 1: Using shopify.app.toml (Recommended)

Add the following to your `shopify.app.toml` file:

```toml
[webhooks]
api_version = "2024-07"

[[webhooks.subscriptions]]
compliance_topics = ["customers/data_request", "customers/redact", "shop/redact"]
uri = "https://your-domain.com/api/channels/shopify/webhooks"
```

### Method 2: Using Partner Dashboard

1. Go to [Shopify Partners Dashboard](https://partners.shopify.com)
2. Navigate to your app
3. Go to "App Setup" > "Configuration" > "Compliance webhooks"
4. Add each webhook endpoint:

#### Customer Data Request
- **Topic**: `customers/data_request`
- **Format**: JSON
- **URL**: `https://your-domain.com/api/channels/shopify/webhooks/customers/data_request`
- **API Version**: 2024-07

#### Customer Data Erasure
- **Topic**: `customers/redact`
- **Format**: JSON
- **URL**: `https://your-domain.com/api/channels/shopify/webhooks/customers/redact`
- **API Version**: 2024-07

#### Shop Data Erasure
- **Topic**: `shop/redact`
- **Format**: JSON
- **URL**: `https://your-domain.com/api/channels/shopify/webhooks/shop/redact`
- **API Version**: 2024-07

## Webhook Payloads

### customers/data_request Payload
```json
{
  "shop_id": 954889,
  "shop_domain": "{shop}.myshopify.com",
  "orders_requested": [299938, 280263, 220458],
  "customer": {
    "id": 191167,
    "email": "john@example.com",
    "phone": "555-625-1199"
  },
  "data_request": {
    "id": 9999
  }
}
```

### customers/redact Payload
```json
{
  "shop_id": 954889,
  "shop_domain": "{shop}.myshopify.com",
  "customer": {
    "id": 191167,
    "email": "john@example.com",
    "phone": "555-625-1199"
  },
  "orders_to_redact": [299938, 280263, 220458]
}
```

### shop/redact Payload
```json
{
  "shop_id": 954889,
  "shop_domain": "{shop}.myshopify.com"
}
```

## Environment Variables

Make sure these are set in your environment:

```env
# Shopify App Configuration
SHOPIFY_API_KEY=your-app-api-key
SHOPIFY_API_SECRET=your-app-api-secret
SHOPIFY_API_VERSION=2024-07
SHOPIFY_SCOPES=read_orders,write_orders,read_customers
SHOPIFY_REDIRECT_URI=https://your-domain.com/api/channels/shopify/callback
```

## Testing Webhooks Locally

### Using ngrok (for development)
1. Install ngrok: `npm install -g ngrok`
2. Start your local server: `npm run dev`
3. Expose your local server: `ngrok http 4000`
4. Use the ngrok URL in Shopify webhook configuration
5. Example: `https://abc123.ngrok.io/api/channels/shopify/webhooks/customers/data_request`

### Test Endpoint
Use the test endpoint to verify webhook functionality:
- **URL**: `GET /api/channels/shopify/webhooks/test`
- **Purpose**: Verify HMAC signature validation

## Compliance Checklist

- [ ] All three webhook endpoints implemented
- [ ] HMAC signature verification working
- [ ] Endpoints return 200 status code
- [ ] Response time under 5 seconds
- [ ] Customer data export includes all stored data
- [ ] Customer data deletion removes all related data
- [ ] Shop data deletion removes all shop data
- [ ] Webhooks tested with sample data
- [ ] Error handling implemented
- [ ] Logging for audit purposes
- [ ] Headers validation implemented
- [ ] Proper payload parsing implemented

## Data Handling Requirements

### Customer Data Request
- Must export all customer data your app stores
- Include order data for requested orders
- Include analytics, preferences, and any other customer-specific data
- Provide data to store owner within 30 days

### Customer Data Erasure
- Must delete all customer-related data from your database
- Remove customer records, order data, analytics, etc.
- Must be completed within 30 days
- If legally required to retain data, do not complete the action

### Shop Data Erasure
- Must delete all shop-related data when app is uninstalled
- Remove shop settings, configurations, and all associated data
- Must be completed within 30 days
- Sent 48 hours after app uninstallation

## Common Issues

### 1. HMAC Verification Fails
- Check API secret is correct
- Ensure request body is properly formatted
- Verify webhook URL is accessible
- Check Content-Type header is application/json

### 2. Timeout Errors
- Optimize database queries
- Use background jobs for heavy processing
- Return 200 immediately, process asynchronously
- Keep response time under 5 seconds

### 3. Missing Data
- Review what data your app stores
- Ensure all customer/shop data is included in exports
- Test with real Shopify data
- Implement comprehensive data mapping

## Security Best Practices

1. **Always verify HMAC signatures**
2. **Use HTTPS for all webhook URLs**
3. **Implement rate limiting**
4. **Log all webhook events for audit**
5. **Handle errors gracefully**
6. **Never expose sensitive data in logs**
7. **Validate all webhook headers**
8. **Use proper Content-Type headers**

## Support

For issues with webhook implementation:
1. Check Shopify's webhook documentation
2. Review error logs in your application
3. Test with Shopify's webhook testing tools
4. Contact Shopify Partner Support if needed

## Additional Resources

- [Shopify Webhooks Documentation](https://shopify.dev/docs/apps/webhooks)
- [GDPR Compliance Guide](https://shopify.dev/docs/apps/privacy)
- [Webhook Testing Guide](https://shopify.dev/docs/apps/webhooks/testing)
- [App Store Requirements](https://shopify.dev/docs/apps/store/requirements) 