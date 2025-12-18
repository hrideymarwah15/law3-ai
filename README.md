# Nyaay Saathi - Legal Services Platform API

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7+-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)

A production-ready Node.js/Express backend for the Nyaay Saathi legal services platform, providing API endpoints for lawyer discovery, consultation booking, AI-powered legal chatbot, case tracking, and more.

[Getting Started](#-quick-start) •
[API Documentation](#-api-endpoints) •
[Docker Deployment](#-docker-deployment) •
[Contributing](#-contributing)

</div>

---

## 🚀 Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Supabase Auth with email/password, phone OTP, and OAuth |
| 👨‍⚖️ **Lawyer Discovery** | Search verified lawyers by specialization, location, rating |
| 📅 **Consultation Booking** | Schedule paid video consultations with Razorpay payments |
| 🤖 **AI Legal Chatbot** | Google Gemini 2.0 powered legal guidance in Hindi & English |
| 📁 **Case Tracking** | Track court cases and set hearing reminders |
| 📱 **SMS Notifications** | Twilio-powered reminders and confirmations |
| 🛡️ **Admin Dashboard** | Lawyer verification, user management, analytics |
| 📊 **Audit Logging** | Comprehensive audit trail for compliance |
| 💰 **Cost Calculator** | Legal cost estimates by case type and city |

## 📋 Prerequisites

- Node.js 20+ 
- Redis 7+
- Supabase account (PostgreSQL, Auth, Storage)
- Razorpay account (payments)
- Twilio account (SMS)
- Google AI Studio account (Gemini API)
- Docker & Docker Compose (optional)

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Runtime** | Node.js 20+ |
| **Framework** | Express.js 4.x |
| **Database** | PostgreSQL (via Supabase) |
| **Authentication** | Supabase Auth + Custom OTP |
| **Caching** | Redis 7 (ioredis) |
| **Payments** | Razorpay |
| **SMS** | Twilio |
| **AI** | Google Gemini 2.0 Flash |
| **Validation** | Zod |
| **Logging** | Pino |
| **Monitoring** | Sentry |
| **Container** | Docker + Docker Compose |

## 📁 Project Structure

```
nyaay-saathi/
├── 📂 src/
│   ├── 📂 config/
│   │   ├── logger.js         # Pino logger configuration
│   │   ├── redis.js          # Redis client & cache utilities
│   │   └── supabase.js       # Supabase clients setup
│   ├── 📂 controllers/
│   │   ├── admin.controller.js
│   │   ├── auth.controller.js
│   │   ├── case.controller.js
│   │   ├── chatbot.controller.js
│   │   ├── consultation.controller.js
│   │   ├── lawyer.controller.js
│   │   ├── reminder.controller.js
│   │   ├── review.controller.js
│   │   └── user.controller.js
│   ├── 📂 middleware/
│   │   ├── auth.js           # Supabase auth middleware
│   │   ├── audit.middleware.js # Audit logging middleware
│   │   ├── errorHandler.js   # Error classes & handlers
│   │   ├── rateLimiter.js    # Rate limiting middleware
│   │   ├── requestId.js      # Request ID tracing
│   │   └── validate.js       # Zod validation middleware
│   ├── 📂 routes/
│   │   ├── admin.routes.js
│   │   ├── auth.routes.js
│   │   ├── case.routes.js
│   │   ├── chatbot.routes.js
│   │   ├── consultation.routes.js
│   │   ├── health.routes.js
│   │   ├── lawyer.routes.js
│   │   ├── reminder.routes.js
│   │   ├── review.routes.js
│   │   ├── user.routes.js
│   │   └── webhook.routes.js
│   ├── 📂 services/
│   │   ├── audit.service.js      # Audit logging service
│   │   ├── chatbot.service.js    # Gemini AI integration
│   │   ├── otp.service.js        # OTP management
│   │   ├── payment.service.js    # Razorpay integration
│   │   ├── sms.service.js        # Twilio integration
│   │   ├── storage.service.js    # Supabase Storage
│   │   └── video.service.js      # Video meeting links
│   ├── 📂 validators/
│   │   ├── admin.validators.js
│   │   ├── auth.validators.js
│   │   ├── case.validators.js
│   │   ├── common.validators.js
│   │   ├── consultation.validators.js
│   │   └── lawyer.validators.js
│   └── index.js              # Express app entry point
├── 📂 database/
│   └── schema.sql            # PostgreSQL schema
├── 📄 Dockerfile             # Multi-stage Docker build
├── 📄 docker-compose.yml     # Production compose
├── 📄 docker-compose.dev.yml # Development compose
├── 📄 .env.example           # Environment template
└── 📄 package.json
```

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd law3.0

# Copy environment file and configure
cp .env.example .env
# Edit .env with your credentials

# Start with Docker Compose
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f api
```

The API will be available at `http://localhost:3000`

### Option 2: Local Development

#### 1. Clone & Install

```bash
git clone <repository-url>
cd law3.0
npm install
```

#### 2. Environment Setup

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
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
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
GEMINI_API_KEY=your-gemini-api-key

# Sentry (optional)
SENTRY_DSN=your-sentry-dsn
```

#### 3. Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the schema migration in Supabase SQL Editor:
   ```sql
   -- Copy contents of database/schema.sql and execute
   ```

3. Create Storage buckets in Supabase Dashboard → Storage:
   - `profile-photos` (public)
   - `lawyer-documents` (private)
   - `case-documents` (private)

#### 4. Start Redis

```bash
# macOS
brew services start redis

# Ubuntu/Debian
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

#### 5. Run the Server

```bash
# Development (with hot reload)
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
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/signup` | ❌ | Register with email/password |
| POST | `/signin` | ❌ | Login with email/password |
| POST | `/signin/otp` | ❌ | Request OTP for phone login |
| POST | `/verify-otp` | ❌ | Verify OTP code |
| POST | `/signout` | ✅ | Logout user |
| POST | `/refresh` | ✅ | Refresh access token |
| GET | `/me` | ✅ | Get current user |
| POST | `/forgot-password` | ❌ | Request password reset |
| POST | `/reset-password` | ❌ | Reset password with token |

### Users (`/api/v1/user`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/profile` | ✅ | Get user profile |
| PUT | `/profile` | ✅ | Update profile |
| PUT | `/change-password` | ✅ | Change password |

### Lawyers (`/api/v1/lawyers`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | List verified lawyers |
| GET | `/search` | ❌ | Search lawyers with filters |
| GET | `/:lawyer_id` | ❌ | Get lawyer profile |
| GET | `/:lawyer_id/availability` | ❌ | Get available slots |
| PUT | `/availability` | ✅ 👨‍⚖️ | Set availability (lawyer only) |

### Consultations (`/api/v1/consultations`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/book` | ✅ | Book a consultation |
| POST | `/confirm-payment` | ✅ | Confirm Razorpay payment |
| GET | `/` | ✅ | List user's consultations |
| GET | `/:id` | ✅ | Get consultation details |
| POST | `/:id/cancel` | ✅ | Cancel consultation |
| POST | `/:id/complete` | ✅ 👨‍⚖️ | Mark as complete |

### Reviews (`/api/v1/reviews`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ✅ | Submit review |
| GET | `/lawyer/:lawyer_id` | ❌ | Get lawyer reviews |

### Cases (`/api/v1/cases`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ✅ | Add a case |
| GET | `/` | ✅ | List user's cases |
| GET | `/:id` | ✅ | Get case details |
| PUT | `/:id` | ✅ | Update case |
| DELETE | `/:id` | ✅ | Delete case |

### Reminders (`/api/v1/reminders`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ✅ | Create reminder |
| GET | `/` | ✅ | List reminders |
| GET | `/upcoming` | ✅ | Get upcoming reminders |
| PUT | `/:id` | ✅ | Update reminder |
| DELETE | `/:id` | ✅ | Delete reminder |

### Chatbot (`/api/v1/chatbot`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/query` | ❌ | Send message to AI chatbot |
| POST | `/cost-estimate` | ❌ | Get legal cost estimate |
| GET | `/history/:session_id` | ❌ | Get chat history |

### Admin (`/api/v1/admin`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard` | ✅ 🔑 | Dashboard stats |
| GET | `/lawyers` | ✅ 🔑 | List all lawyers |
| GET | `/lawyers/pending` | ✅ 🔑 | Pending verifications |
| PUT | `/lawyers/:id/verify` | ✅ 🔑 | Verify lawyer |
| PUT | `/lawyers/:id/reject` | ✅ 🔑 | Reject lawyer |
| GET | `/users` | ✅ 🔑 | List all users |
| GET | `/users/:id` | ✅ 🔑 | User details |
| PUT | `/users/:id/ban` | ✅ 🔑 | Ban user |
| PUT | `/users/:id/unban` | ✅ 🔑 | Unban user |
| GET | `/consultations` | ✅ 🔑 | List all consultations |
| GET | `/audit-logs` | ✅ 🔑 | View audit logs |

### Webhooks (`/webhooks`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/razorpay` | Razorpay payment webhooks |

> **Legend:** ✅ = Auth Required, ❌ = Public, 👨‍⚖️ = Lawyer Only, 🔑 = Admin Only

## 🔒 Authentication

The API uses Supabase Auth with JWT tokens. Include the access token in requests:

```bash
Authorization: Bearer <supabase-access-token>
```

### Example Request

```bash
curl -X GET http://localhost:3000/api/v1/user/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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

## 🐳 Docker Deployment

### Production

```bash
# Build and start containers
docker-compose up -d --build

# Check container status
docker-compose ps

# View logs
docker-compose logs -f api

# Stop containers
docker-compose down
```

### Development (with hot reload)

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f api
```

### Docker Configuration

The project includes:

- **Dockerfile** - Multi-stage build (base → deps → development/production)
- **docker-compose.yml** - Production setup with Redis
- **docker-compose.dev.yml** - Development with volume mounts & hot reload

### Container Health Checks

Both containers include health checks:
- **API**: `wget --spider http://localhost:3000/health`
- **Redis**: `redis-cli ping`

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Test API endpoints manually
curl http://localhost:3000/health
curl http://localhost:3000/health/detailed
```

## 📦 Production Deployment

### Environment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure real `FRONTEND_URL` for CORS
- [ ] Set up HTTPS (reverse proxy)
- [ ] Configure Razorpay webhook secret
- [ ] Verify Twilio phone number is SMS-enabled
- [ ] Create Supabase storage buckets
- [ ] Enable Supabase Point-in-Time Recovery
- [ ] Configure Sentry for error tracking

### Recommended Platforms

| Platform | Notes |
|----------|-------|
| **Railway** | One-click deploy, auto-scaling |
| **Render** | Free tier available, easy setup |
| **Fly.io** | Global edge deployment |
| **AWS ECS** | Enterprise-grade, full control |
| **Google Cloud Run** | Serverless containers |

### Health Check Endpoints

For orchestrators (Kubernetes, ECS, etc.):

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## 🔐 Security Features

- ✅ Helmet.js security headers
- ✅ CORS with whitelist
- ✅ Rate limiting per endpoint type
- ✅ Input validation with Zod
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection
- ✅ Request ID tracing
- ✅ Audit logging for sensitive actions
- ✅ Non-root Docker user

## 📄 License

MIT License

## 👥 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🆘 Support

- 📧 Email: support@nyaaysaathi.com
- 📖 Docs: [API Documentation](https://docs.nyaaysaathi.com)
- 🐛 Issues: [GitHub Issues](https://github.com/nyaaysaathi/api/issues)

---

<div align="center">

Made with ❤️ for access to justice in India

**[⬆ Back to Top](#nyaay-saathi---legal-services-platform-api)**

</div>
