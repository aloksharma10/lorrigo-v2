# Shopify Integration

This module handles Shopify store integration with two distinct flows:

## 1. Login with Shopify (Creates New Session)

**Purpose**: Allow users to sign up/login using their Shopify store credentials.

**Routes**: `/auth/shopify/*`

- `/auth/shopify/auth-url` - Generate OAuth URL for login
- `/auth/shopify/callback` - Handle OAuth callback and create new user session

**Behavior**:

- Creates new user account if one doesn't exist
- Creates new session and returns JWT token
- User is logged in as the Shopify store owner

**Frontend API**: `apps/web/lib/apis/shopify-login.ts`

## 2. Connect Shopify Store (Adds to Existing Account)

**Purpose**: Allow existing users to connect their Shopify store to their current account.

**Routes**: `/channels/shopify/*`

- `/channels/shopify/auth/url` - Generate OAuth URL for connection
- `/channels/shopify/callback` - Handle OAuth callback and connect to existing user

**Behavior**:

- Requires existing authenticated user
- Connects Shopify store to current user account
- Does NOT create new session
- User remains logged in as their original account

**Frontend API**: `apps/web/lib/apis/channels/shopify/index.ts`

## Key Differences

| Aspect             | Login Flow                 | Connect Flow                     |
| ------------------ | -------------------------- | -------------------------------- |
| **Session**        | Creates new session        | No new session                   |
| **User**           | Creates/finds user by shop | Uses existing authenticated user |
| **Purpose**        | Authentication             | Store connection                 |
| **Routes**         | `/auth/shopify/*`          | `/channels/shopify/*`            |
| **Authentication** | Not required               | Required                         |

## Implementation Details

### ShopifyChannel Class

The `ShopifyChannel` class provides two main methods:

1. `handleShopifyLogin()` - For login flows (creates new session)
2. `connectShopifyToExistingUser()` - For connect flows (no new session)

### Database Schema

Shopify connections are stored in the `shopifyConnection` table with:

- `shop`: Store domain
- `access_token`: OAuth access token
- `user_id`: Associated user ID
- `scope`: OAuth scopes

## Usage Examples

### Login Flow

```typescript
// Frontend - Login with Shopify
import { getShopifyLoginUrl } from '@/lib/apis/shopify-login';

const authUrl = await getShopifyLoginUrl('mystore.myshopify.com');
window.location.href = authUrl;
```

### Connect Flow

```typescript
// Frontend - Connect Shopify to existing account
import { useShopify } from '@/lib/apis/channels/shopify';

const { initiateConnect } = useShopify();
initiateConnect('mystore.myshopify.com');
```

## Security Considerations

1. **OAuth State Validation**: Both flows validate OAuth state to prevent CSRF attacks
2. **Shop Domain Validation**: Validates shop domain format
3. **User Verification**: Connect flow verifies existing user is active
4. **Connection Uniqueness**: Prevents connecting same shop to multiple users
5. **Token Security**: Access tokens are stored securely and not exposed in responses

## Error Handling

Both flows handle common errors:

- Invalid OAuth state
- Invalid shop domain
- Token exchange failures
- User account issues
- Connection conflicts

Errors are redirected to appropriate frontend pages with descriptive messages.
