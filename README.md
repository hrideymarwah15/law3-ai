# Nyaay Saathi - Legal Services Platform API

A production-ready Node.js/Express backend for the Nyaay Saathi legal services platform, providing API endpoints for lawyer discovery, consultation booking, legal chatbot, case tracking, and more.

## 🚀 Features

- **Authentication**: Supabase Auth with email/password, phone OTP, and OAuth
- **Lawyer Discovery**: Search verified lawyers by specialization, location, rating
- **Consultation Booking**: Schedule paid video consultations with Razorpay payments
- **AI Legal Chatbot**: Google Gemini-powered legal guidance in Hindi & English
- **Case Tracking**: Track court cases and set hearing reminders
- **SMS Notifications**: Twilio-powered reminders and confirmations
- **Admin Dashboard**: Lawyer verification, user management, analytics

## 📋 Prerequisites

- Node.js 20+ 
- Redis 6+
- Supabase account (PostgreSQL, Auth, Storage)
- Razorpay account (payments)
- Twilio account (SMS)
- Google AI Studio account (Gemini API)

## 🛠️ Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Caching**: Redis (ioredis)
- **Payments**: Razorpay
- **SMS**: Twilio
- **AI**: Google Gemini API
- **Validation**: Zod
- **Logging**: Pino
- **Rate Limiting**: express-rate-limit

## 📁 Project Structure

```
src/
├── config/
│   ├── logger.js         # Pino logger configuration
│   ├── redis.js          # Redis client & cache utilities
│   └── supabase.js       # Supabase clients setup
├── controllers/
│   ├── admin.controller.js
│   ├── auth.controller.js
│   ├── case.controller.js
│   ├── chatbot.controller.js
│   ├── consultation.controller.js
│   ├── lawyer.controller.js
│   ├── reminder.controller.js
│   ├── review.controller.js
│   └── user.controller.js
├── middleware/
│   ├── auth.js           # Supabase auth middleware
│   ├── errorHandler.js   # Error classes & handlers
│   ├── rateLimiter.js    # Rate limiting middleware
│   ├── requestId.js      # Request ID tracing
│   └── validate.js       # Zod validation middleware
├── routes/
│   ├── admin.routes.js
│   ├── auth.routes.js
│   ├── case.routes.js
│   ├── chatbot.routes.js
│   ├── consultation.routes.js
│   ├── health.routes.js
│   ├── lawyer.routes.js
│   ├── reminder.routes.js
│   ├── review.routes.js
│   ├── user.routes.js
│   └── webhook.routes.js
├── services/
│   ├── chatbot.service.js    # Gemini AI integration
│   ├── payment.service.js    # Razorpay integration
│   ├── sms.service.js        # Twilio integration
│   ├── storage.service.js    # Supabase Storage
│   └── video.service.js      # Google Meet links
├── validators/
│   ├── admin.validators.js
│   ├── auth.validators.js
│   ├── case.validators.js
│   ├── common.validators.js
│   ├── consultation.validators.js
│   └── lawyer.validators.js
└── index.js              # Express app entry point

database/
└── schema.sql            # PostgreSQL schema (run in Supabase)
```

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone <repository-url>
cd law3.0
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Server
PORT=3000
NODE_ENV=development
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Redis
REDIS_URL=redis://localhost:6379

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# Twilio
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# Google AI
GOOGLE_AI_API_KEY=your-gemini-api-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the schema migration in Supabase SQL Editor:
   - Copy contents of `database/schema.sql`
   - Execute in SQL Editor

3. Create Storage buckets in Supabase Dashboard:
   - `profile-photos` (public)
   - `lawyer-documents` (private)
   - `case-documents` (private)

### 4. Start Redis

```bash
# macOS
brew services start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

### 5. Run the Server

```bash
# Development
npm run dev

# Production
npm start
```

## 📚 API Endpoints

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/detailed` | Detailed health with dependencies |
| GET | `/health/ready` | Kubernetes readiness probe |
| GET | `/health/live` | Kubernetes liveness probe |

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup` | Register with email/password |
| POST | `/signin` | Login with email/password |
| POST | `/signin/otp` | Request OTP for phone login |
| POST | `/verify-otp` | Verify OTP code |
| POST | `/signout` | Logout user |
| POST | `/refresh` | Refresh access token |
| GET | `/me` | Get current user |
| POST | `/forgot-password` | Request password reset |
| POST | `/reset-password` | Reset password with token |
| POST | `/complete-profile` | Complete profile after OAuth |

### Users (`/api/v1/user`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get user profile |
| PUT | `/profile` | Update profile |
| PUT | `/change-password` | Change password |

### Lawyers (`/api/v1/lawyers`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search` | Search lawyers with filters |
| GET | `/:lawyer_id` | Get lawyer profile |
| GET | `/:lawyer_id/availability` | Get available slots |
| PUT | `/availability` | Set availability (lawyer only) |

### Consultations (`/api/v1/consultations`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/book` | Book a consultation |
| POST | `/confirm-payment` | Confirm Razorpay payment |
| GET | `/my-consultations` | List user's consultations |
| POST | `/:consultation_id/cancel` | Cancel consultation |
| POST | `/:consultation_id/complete` | Mark as complete |

### Reviews (`/api/v1/reviews`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/create` | Submit review |
| GET | `/lawyer/:lawyer_id` | Get lawyer reviews |

### Cases (`/api/v1/cases`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/create` | Add a case |
| GET | `/my-cases` | List user's cases |
| GET | `/:case_id` | Get case details |
| PUT | `/:case_id` | Update case |
| DELETE | `/:case_id` | Delete case |

### Reminders (`/api/v1/reminders`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/create` | Create reminder |
| GET | `/my-reminders` | List reminders |
| GET | `/upcoming` | Get upcoming reminders |
| PUT | `/:reminder_id` | Update reminder |
| DELETE | `/:reminder_id` | Delete reminder |

### Chatbot (`/api/v1/chatbot`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/query` | Send message to chatbot |
| POST | `/cost-estimate` | Get legal cost estimate |
| GET | `/history/:session_id` | Get chat history |

### Admin (`/api/v1/admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Dashboard stats |
| GET | `/lawyers/pending` | Pending verifications |
| PUT | `/lawyers/:lawyer_id/verify` | Verify/reject lawyer |
| GET | `/users` | List all users |
| GET | `/users/:user_id` | User details |
| PUT | `/users/:user_id/ban` | Ban/unban user |
| GET | `/consultations` | List all consultations |
| GET | `/revenue` | Revenue analytics |

### Webhooks (`/webhooks`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/razorpay` | Razorpay payment webhooks |
| POST | `/supabase` | Supabase database webhooks |

## 🔒 Authentication

The API uses Supabase Auth. Include the JWT token in requests:

```
Authorization: Bearer <supabase-access-token>
```

## ⚡ Rate Limits

| Endpoint Type | Window | Max Requests |
|---------------|--------|--------------|
| General | 15 min | 100 |
| Auth | 1 min | 5 |
| OTP | 1 min | 3 |
| Search | 1 min | 30 |
| Chatbot | 1 min | 20 |
| Admin | 15 min | 200 |

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 📦 Deployment

### Docker

```bash
docker build -t nyaay-saathi-api .
docker run -p 3000:3000 --env-file .env nyaay-saathi-api
```

### Environment Variables for Production

Set all environment variables in your hosting platform:
- Railway, Render, Fly.io, etc.
- Ensure `NODE_ENV=production`

## 📄 License

MIT License

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
