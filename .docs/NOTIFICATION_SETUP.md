# Notification System Setup Guide

This guide will help you set up the comprehensive notification system for your Lorrigo application.

## Features

- **Multi-channel notifications**: Email, SMS, WhatsApp, and System notifications
- **OTP functionality**: Generate, send, verify, and resend OTPs
- **Queue-based processing**: Scalable notification processing with BullMQ
- **Template support**: Handlebars-based email templates
- **Rate limiting**: OTP cooldown and attempt limits
- **Real-time system notifications**: Redis-based in-app notifications
- **Health monitoring**: Service status and job tracking

## Prerequisites

- Node.js 18+ and npm/yarn
- Redis server
- SMTP email service (Gmail, SendGrid, etc.)
- Twilio account (for SMS)

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@lorrigo.com
EMAIL_FROM_NAME=Lorrigo

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# OTP Configuration
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
OTP_MAX_ATTEMPTS=3
OTP_COOLDOWN_MINUTES=5

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:3000
```

## Installation

1. Install dependencies:

```bash
npm install
```

2. The notification system is automatically integrated into your Fastify application.

## Usage

### Sending Notifications

#### Via API Routes

```bash
# Send email notification
curl -X POST http://localhost:4000/api/v2/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "recipient": "user@example.com",
    "subject": "Welcome!",
    "message": "Welcome to our platform!"
  }'

# Send SMS notification
curl -X POST http://localhost:4000/api/v2/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sms",
    "recipient": "+1234567890",
    "message": "Your order has been shipped!"
  }'

# Send system notification
curl -X POST http://localhost:4000/api/v2/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "system",
    "recipient": "user-id",
    "subject": "New Message",
    "message": "You have a new message"
  }'
```

#### Via Fastify Decorators

```typescript
// In your route handlers
const result = await fastify.sendNotification({
  type: 'email',
  recipient: 'user@example.com',
  subject: 'Welcome!',
  message: 'Welcome to our platform!',
});

// Send immediate notification (bypass queue)
const result = await fastify.sendImmediateNotification({
  type: 'sms',
  recipient: '+1234567890',
  message: 'Urgent: Your order is ready!',
});
```

### OTP Functionality

#### Generate and Send OTP

```bash
# Generate OTP for email
curl -X POST http://localhost:4000/api/v2/notifications/otp/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "login",
    "identifier": "user@example.com",
    "identifierType": "email",
    "purpose": "Login verification"
  }'

# Generate OTP for phone
curl -X POST http://localhost:4000/api/v2/notifications/otp/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "registration",
    "identifier": "+1234567890",
    "identifierType": "phone",
    "purpose": "Phone verification"
  }'
```

#### Verify OTP

```bash
curl -X POST http://localhost:4000/api/v2/notifications/otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "user@example.com",
    "identifierType": "email",
    "otp": "123456",
    "type": "login"
  }'
```

#### Resend OTP

```bash
curl -X POST http://localhost:4000/api/v2/notifications/otp/resend \
  -H "Content-Type: application/json" \
  -d '{
    "type": "login",
    "identifier": "user@example.com",
    "identifierType": "email",
    "purpose": "Login verification"
  }'
```

### System Notifications

#### Get User Notifications

```bash
curl -X GET http://localhost:4000/api/v2/notifications/system/user-id?limit=10
```

#### Mark as Read

```bash
curl -X PUT http://localhost:4000/api/v2/notifications/system/user-id/read/0
```

#### Clear All Notifications

```bash
curl -X DELETE http://localhost:4000/api/v2/notifications/system/user-id
```

### Email Templates

The system includes pre-built email templates:

- `otp-email.html` - OTP verification emails
- `password-reset.html` - Password reset emails
- `welcome.html` - Welcome emails

#### Using Templates

```typescript
// Send OTP email
await fastify.sendOTPEmail('user@example.com', '123456', 'login', {
  userName: 'John Doe',
  expiryMinutes: 10,
});

// Send password reset email
await fastify.sendPasswordResetEmail('user@example.com', 'reset-token', {
  userName: 'John Doe',
  expiryHours: 24,
});

// Send welcome email
await fastify.sendWelcomeEmail('user@example.com', {
  userName: 'John Doe',
  loginUrl: 'http://localhost:3000/login',
});
```

### SMS Notifications

```typescript
// Send OTP SMS
await fastify.sendOTPSMS('+1234567890', '123456', 'login', {
  expiryMinutes: 10,
});

// Send order status SMS
await fastify.sendOrderStatusSMS('+1234567890', 'ORD-123', 'Shipped', {
  trackingNumber: 'TRK-456',
  estimatedDelivery: '2024-01-15',
});

// Send delivery notification
await fastify.sendDeliveryNotificationSMS('+1234567890', 'ORD-123', 'FedEx', 'TRK-456');
```

## API Endpoints

### Notifications

- `POST /api/v2/notifications/send` - Send queued notification
- `POST /api/v2/notifications/send-immediate` - Send immediate notification
- `GET /api/v2/notifications/job/:jobId` - Get job status
- `GET /api/v2/notifications/status` - Get service status

### OTP

- `POST /api/v2/notifications/otp/generate` - Generate and send OTP
- `POST /api/v2/notifications/otp/verify` - Verify OTP
- `POST /api/v2/notifications/otp/resend` - Resend OTP

### System Notifications

- `GET /api/v2/notifications/system/:userId` - Get user notifications
- `PUT /api/v2/notifications/system/:userId/read/:index` - Mark as read
- `DELETE /api/v2/notifications/system/:userId` - Clear all notifications

### Health Check

- `GET /health/notifications` - Notification services health check

## Configuration

### OTP Settings

```typescript
// In config/app.ts
OTP: {
  EXPIRY_MINUTES: 10,      // OTP validity period
  LENGTH: 6,               // OTP code length
  MAX_ATTEMPTS: 3,         // Maximum verification attempts
  COOLDOWN_MINUTES: 5,     // Cooldown between OTP requests
}
```

### Email Settings

```typescript
EMAIL: {
  HOST: 'smtp.gmail.com',
  PORT: 587,
  SECURE: false,
  USER: 'your-email@gmail.com',
  PASSWORD: 'your-app-password',
  FROM: 'noreply@lorrigo.com',
  FROM_NAME: 'Lorrigo',
}
```

### SMS Settings

```typescript
SMS: {
  TWILIO_ACCOUNT_SID: 'your-account-sid',
  TWILIO_AUTH_TOKEN: 'your-auth-token',
  TWILIO_PHONE_NUMBER: '+1234567890',
}
```

## Monitoring

### Health Check

```bash
curl http://localhost:4000/health/notifications
```

Response:

```json
{
  "status": "ok",
  "services": {
    "email": { "connected": true },
    "sms": { "connected": true },
    "redis": { "connected": true }
  },
  "worker": {
    "isRunning": true,
    "concurrency": 5,
    "processedJobs": 150,
    "failedJobs": 2
  },
  "timestamp": "2024-01-10T10:30:00.000Z"
}
```

### Job Status

```bash
curl http://localhost:4000/api/v2/notifications/job/job-id-here
```

## Security Features

- **Rate limiting**: OTP cooldown periods
- **Attempt limits**: Maximum verification attempts
- **Expiry**: Automatic OTP expiration
- **Secure storage**: Redis-based OTP storage
- **Template injection protection**: Handlebars escaping

## Scaling Considerations

- **Queue processing**: BullMQ handles high-volume notifications
- **Redis clustering**: Support for Redis cluster
- **Worker concurrency**: Configurable worker concurrency
- **Job persistence**: Failed job retry mechanism
- **Memory management**: Automatic cleanup of expired data

## Troubleshooting

### Common Issues

1. **Email not sending**

   - Check SMTP credentials
   - Verify email service settings
   - Check firewall/network restrictions

2. **SMS not sending**

   - Verify Twilio credentials
   - Check phone number format (E.164)
   - Ensure sufficient Twilio credits

3. **OTP not working**

   - Check Redis connection
   - Verify OTP configuration
   - Check rate limiting settings

4. **Queue not processing**
   - Check Redis connection
   - Verify worker is running
   - Check job queue status

### Debug Mode

Enable debug logging by setting:

```env
LOG_LEVEL=debug
```

## Support

For issues and questions:

- Check the health endpoint: `/health/notifications`
- Review application logs
- Monitor Redis and queue status
- Contact the development team
