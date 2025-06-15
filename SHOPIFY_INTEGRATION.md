# Shopify Integration Setup

This document provides instructions for setting up the Shopify integration for the Lorrigo application.

## Prerequisites

1. A Shopify Partner account
2. A Shopify app created in the Partner Dashboard

## Setup Steps

### 1. Create a Shopify App

1. Go to your [Shopify Partner Dashboard](https://partners.shopify.com/)
2. Navigate to Apps > Create App
3. Fill in the required information:
   - App name: Lorrigo
   - App URL: https://your-production-url.com (or http://localhost:3000 for development)

### 2. Configure App Settings

In your Shopify app settings:

1. Set the App URL to your frontend URL (e.g., `http://localhost:3000`)
2. Add the following Redirect URLs:
   - `http://localhost:3000/seller/channels/callback` (for development)
   - `https://your-production-url.com/seller/channels/callback` (for production)
3. Request the following scopes:
   - `read_orders`
   - `read_products`
   - `read_customers`

### 3. Environment Configuration

#### Backend (.env in apps/api)

```
# Shopify
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_API_VERSION=2023-10
SHOPIFY_SCOPES=read_orders,read_products,read_customers
SHOPIFY_REDIRECT_URI=http://localhost:3000/seller/channels/callback
```

### 4. Flow Explanation

1. User clicks "Connect Shopify Store" on the Channels page
2. Frontend calls the backend to get an auth URL
3. User is redirected to Shopify's OAuth page
4. User authorizes the app
5. Shopify redirects back to our callback URL (`/seller/channels/callback`)
6. The callback page exchanges the code for a token via the backend
7. User is redirected back to the Channels page with a success message

### 5. Testing

1. Start both frontend and backend servers:
   ```
   # Frontend (Port 3000)
   cd apps/web
   npm run dev
   
   # Backend (Port 4000)
   cd apps/api
   npm run dev
   ```
2. Navigate to http://localhost:3000/seller/channels
3. Enter a Shopify store domain and click "Connect Shopify Store"
4. Complete the OAuth flow
5. Verify that the connection is established

## Troubleshooting

- If you encounter CORS issues, ensure that the backend's CORS settings include the frontend URL
- Check that the Shopify API key and secret are correctly set in the backend .env file
- Verify that the redirect URI in the Shopify app settings matches the one in your backend configuration 