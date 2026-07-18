# Cadence Backend Server

Professional, secure backend for CHROFA booking/scheduling SaaS.

## Tech Stack

- **Node.js + Express** - API layer
- **MongoDB + Mongoose** - Database with ODM for schema validation
- **JWT** - Authentication with access/refresh token rotation
- **bcryptjs** - Secure password hashing (cost factor 12)
- **Zod** - Input validation and sanitization
- **Helmet.js** - Secure HTTP headers
- **express-rate-limit** - Rate limiting for brute-force protection
- **express-mongo-sanitize** - NoSQL injection protection
- **Nodemailer** - Email service for password reset

## Security Features

1. **Password Security**
   - All passwords hashed with bcrypt (cost factor 12+)
   - Never stored in plaintext or logged
   - Minimum 8 character requirement

2. **JWT Authentication**
   - Short-lived access tokens (15 minutes)
   - Long-lived refresh tokens (7 days) stored in httpOnly, secure, sameSite cookies
   - Token rotation on refresh
   - Refresh tokens stored in database with TTL auto-cleanup

3. **Rate Limiting**
   - General API: 100 requests per 15 minutes per IP
   - Auth endpoints: 5 requests per 15 minutes per IP (brute-force protection)

4. **Input Validation**
   - Zod schemas on all endpoints
   - Mongoose schema validation as second layer
   - NoSQL injection protection via express-mongo-sanitize

5. **Authorization**
   - Business ownership enforced at application layer
   - Each user can only access their own appointments, customers, and settings
   - Middleware checks businessId/ownerId on every query

6. **Secure Headers**
   - Helmet.js for security headers
   - Content Security Policy configured
   - CORS restricted to allowed origins only

7. **Environment Variables**
   - All secrets in .env (never committed)
   - JWT secret required (server won't start without it)
   - Email credentials for password reset

## Prerequisites

- Node.js 18+
- MongoDB 6.0+
- Redis 7.0+ (for BullMQ queues)

## Setup

1. **Clone the repository and navigate to server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your values:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://127.0.0.1:27017/cadence
   REDIS_URL=redis://127.0.0.1:6379
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   JWT_SECRET=your_32_char_random_secret_here
   EMAIL_SERVICE=gmail
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-specific-password
   EMAIL_FROM=noreply@cadence.app
   ```

   **Generate JWT secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Start MongoDB and Redis**
   - Ensure MongoDB is running on the configured URI
   - Ensure Redis is running for BullMQ queues

5. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/google` - Google OAuth initiation
- `GET /api/auth/google/callback` - Google OAuth callback

### Appointments

- `POST /api/appointments` - Create appointment
- `GET /api/appointments` - List appointments (with filters)
- `GET /api/appointments/:id` - Get single appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Cancel appointment

### Business

- `POST /api/business` - Create business (onboarding)
- `GET /api/business/me` - Get authenticated user's business
- `GET /api/business/search?q=query` - Search businesses (public)
- `GET /api/business/:businessId/qr` - Generate QR code (public)

### Availability

- `GET /api/availability?date=&serviceId=&staffName=` - Get available slots

### Calendar

- `GET /api/calendar/events` - Get calendar events
- `POST /api/calendar/sync` - Trigger calendar sync

### Booking

- `POST /api/book/:businessId` - Public booking endpoint

## Data Models

### User
- `name` (string, required)
- `email` (string, unique, required)
- `password` (string, hashed, required for local auth)
- `role` (enum: 'owner')
- `businessId` (ObjectId, ref: Business)
- `authProvider` (enum: 'local', 'google')
- `googleId` (string, sparse unique)
- `resetPasswordToken` (string, select: false)
- `resetPasswordExpires` (Date, select: false)

### Business
- `name` (string, required)
- `industry` (enum: salon_spa, clinic_medical, legal_consulting, other)
- `ownerId` (ObjectId, ref: User, indexed)
- `phone` (string)
- `timezone` (string, IANA format)
- `openingHours` (array of 7 entries, one per day)
- `services` (array of embedded documents)
- `staff` (array of embedded documents)
- `googleCalendarConnected` (boolean)
- `googleCalendarRefreshToken` (string)
- `integrations` (object)
- `notificationPreferences` (object)

### Appointment
- `businessId` (ObjectId, ref: Business, indexed)
- `customerId` (ObjectId, ref: Customer, indexed)
- `staffName` (string, denormalized)
- `service` (string, denormalized snapshot)
- `durationMinutes` (number, denormalized snapshot)
- `date` (Date, required)
- `status` (enum: pending, confirmed, cancelled, indexed)
- `riskScore` (number, 0-1)
- `googleEventId` (string, indexed)
- `notes` (string)
- `reminderSent` (boolean)

### Customer
- `name` (string, required)
- `email` (string, unique, required)
- `phone` (string)

### RefreshToken
- `token` (string, unique)
- `userId` (ObjectId, ref: User, indexed)
- `expiresAt` (Date, TTL indexed)
- `userAgent` (string)
- `ipAddress` (string)

## Database Indexes

- `User.email` - unique index
- `User.googleId` - sparse unique index
- `Business.ownerId` - index
- `Appointment.businessId` + `Appointment.date` - compound index
- `Appointment.status` - index
- `Appointment.googleEventId` - index
- `Customer.email` - unique index
- `RefreshToken.userId` - index
- `RefreshToken.expiresAt` - TTL index (auto-cleanup)

## Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Test files:
- `tests/auth.test.js` - Authentication flow tests
- `tests/appointments.test.js` - Appointment CRUD tests

## Deployment

### Production Checklist

1. Set `NODE_ENV=production` in .env
2. Use strong, randomly generated JWT_SECRET
3. Configure production MongoDB URI (MongoDB Atlas recommended)
4. Configure production Redis (Upstash/Redis Cloud recommended)
5. Set ALLOWED_ORIGINS to your actual frontend domain(s)
6. Configure SMTP for email service
7. Enable HTTPS (use reverse proxy like nginx)
8. Set up process manager (PM2 recommended)
9. Configure monitoring and logging

### Environment Variables for Production

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/cadence
REDIS_URL=redis://:password@host:port
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
JWT_SECRET=production_secret_min_32_chars
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com
```

## Error Handling

All errors follow a consistent JSON structure:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": [] // Only for validation errors
  }
}
```

Common error codes:
- `VALIDATION_ERROR` - Input validation failed
- `UNAUTHORIZED` - Authentication required or failed
- `FORBIDDEN` - Authorization failed
- `NOT_FOUND` - Resource not found
- `DUPLICATE_KEY` - Unique constraint violation
- `CONFLICT` - Resource conflict (e.g., double booking)
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_SERVER_ERROR` - Unexpected server error

## Logging

Security events are logged to console:
- User registration
- User login
- User logout
- Password reset requests
- Failed authentication attempts

**Important:** Passwords and tokens are never logged.

## License

Proprietary - All rights reserved
