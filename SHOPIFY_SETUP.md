# Shopify Integration Setup Guide

This guide provides detailed instructions for setting up the Shopify integration for your application.

## 1. Create a Shopify Partner Account

If you don't already have one, create a Shopify Partner account at [partners.shopify.com](https://partners.shopify.com).

## 2. Create a Custom App

1. Log in to your Shopify Partner dashboard
2. Go to "Apps" in the left sidebar
3. Click "Create app"
4. Select "Custom app" (or "Public app" if you plan to distribute it)
5. Enter a name for your app (e.g., "Lorrigo")
6. Enter your app URL (e.g., `http://localhost:3000` for development)

## 3. Configure App Settings

### App URLs

1. In your app settings, go to the "App setup" section
2. Set the following URLs:
   - **App URL**: `http://localhost:3000` (for development)
   - **Allowed redirection URL(s)**:
     - `http://localhost:3000/seller/channels/callback`

### App Scopes

1. In the "Access scopes" section, select the following scopes:
   - `read_orders`
   - `read_products`
   - `read_customers`
   - Any other scopes your app needs

## 4. API Credentials

1. In the "API credentials" section, note your:
   - **API Key** (Client ID)
   - **API Secret Key** (Client Secret)

## 5. Environment Configuration

Update your environment variables in the backend (apps/api/.env):

```
# Shopify
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_key_here
SHOPIFY_API_VERSION=2023-10
SHOPIFY_SCOPES=read_orders,read_products,read_customers
SHOPIFY_REDIRECT_URI=http://localhost:3000/seller/channels/callback
```

## 6. Testing the Integration

1. Start your frontend and backend servers
2. Navigate to the Channels page (`http://localhost:3000/seller/channels`)
3. Enter your Shopify store domain (e.g., `your-store.myshopify.com`)
4. Click "Connect Shopify Store"
5. You will be redirected to Shopify's authorization page
6. Accept the permissions
7. You will be redirected back to your application

## 7. Troubleshooting

### Common Issues

1. **"The authorization code was not found or was already used"**
   - This happens if you try to use the same authorization code twice
   - Solution: Start the OAuth flow again by clicking "Connect Shopify Store"

2. **Missing code parameter in callback URL**
   - Check that your redirect URI is correctly set in both your app settings and environment variables
   - Verify that your app has the correct scopes

3. **CORS errors**
   - Ensure your backend has CORS configured to allow requests from your frontend

4. **Authentication errors**
   - Verify that your API key and secret are correct
   - Check that your app is approved and active in your Shopify Partner dashboard

## 8. Production Deployment

When deploying to production:

1. Update your app's URLs in the Shopify Partner dashboard
2. Update your environment variables with production URLs
3. Ensure your production domain is added to the allowed redirection URLs

## 9. Additional Resources

- [Shopify OAuth documentation](https://shopify.dev/docs/apps/auth/oauth)
- [Shopify API documentation](https://shopify.dev/docs/api) 