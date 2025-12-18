# Nyaay Saathi - Legal Services Platform API

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7+-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![Jitsi](https://img.shields.io/badge/Jitsi-Video%20Calls-97979A?style=for-the-badge&logo=jitsi&logoColor=white)

A production-ready Node.js/Express backend for the Nyaay Saathi legal services platform with **124 API endpoints**, providing lawyer discovery, video consultations, real-time chat, AI-powered legal chatbot, case tracking, notifications, and more.

[Getting Started](#-quick-start) •
[API Documentation](#-api-endpoints) •
[Docker Deployment](#-docker-deployment) •
[Contributing](#-contributing)

</div>

---

## 🚀 Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Supabase Auth with email/password, phone OTP, Google OAuth |
| 👨‍⚖️ **Lawyer Discovery** | Search verified lawyers by specialization, location, rating |
| 📝 **Lawyer Registration** | Self-service lawyer registration with admin approval workflow |
| 📅 **Consultation Booking** | Schedule paid video consultations with Razorpay payments |
| 🔄 **Reschedule Support** | Flexible rescheduling with history tracking (max 3x, 4hr notice) |
| 🎥 **Video Consultations** | Jitsi Meet integration with auto-generated meeting links |
| 💬 **Real-time Chat** | Socket.io powered messaging with file sharing & read receipts |
| 🔔 **Notifications** | In-app notifications with preferences, SMS via Twilio |
| 🤖 **AI Legal Chatbot** | Google Gemini 2.0 powered legal guidance in Hindi & English |
| 📁 **Case Tracking** | Track court cases and set hearing reminders |
| 🛡️ **Admin Dashboard** | 30+ admin methods: lawyer verification, user management, analytics |
| 📊 **Audit Logging** | Comprehensive audit trail for compliance |
| 💰 **Cost Calculator** | Legal cost estimates by case type and city |
| 🗑️ **Account Management** | GDPR-compliant account deletion with data export |

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
| **Real-time** | Socket.io 4.x with Redis Adapter |
| **Video Calls** | Jitsi Meet (self-hosted or 8x8.vc) |
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
│   │   ├── logger.js            # Pino logger configuration
│   │   ├── redis.js             # Redis client & cache utilities
│   │   └── supabase.js          # Supabase clients setup
│   ├── 📂 controllers/
│   │   ├── admin.controller.js           # 30+ admin methods
│   │   ├── auth.controller.js            # Authentication
│   │   ├── case.controller.js            # Case management
│   │   ├── chat.controller.js            # Real-time messaging
│   │   ├── chatbot.controller.js         # AI chatbot
│   │   ├── consultation.controller.js    # Booking & reschedule
│   │   ├── lawyer.controller.js          # Lawyer profiles
│   │   ├── lawyer-registration.controller.js  # Self-registration
│   │   ├── notification.controller.js    # In-app notifications
│   │   ├── reminder.controller.js        # Hearing reminders
│   │   ├── review.controller.js          # Reviews & ratings
│   │   └── user.controller.js            # User management
│   ├── 📂 middleware/
│   │   ├── auth.js              # Supabase auth middleware
│   │   ├── audit.middleware.js  # Audit logging middleware
│   │   ├── errorHandler.js      # Error classes & handlers
│   │   ├── rateLimiter.js       # Rate limiting middleware
│   │   ├── requestId.js         # Request ID tracing
│   │   └── validate.js          # Zod validation middleware
│   ├── 📂 routes/
│   │   ├── admin.routes.js      # 29 endpoints
│   │   ├── auth.routes.js       # 11 endpoints
│   │   ├── case.routes.js       # 5 endpoints
│   │   ├── chat.routes.js       # 16 endpoints
│   │   ├── chatbot.routes.js    # 3 endpoints
│   │   ├── consultation.routes.js # 12 endpoints
│   │   ├── health.routes.js     # 4 endpoints
│   │   ├── lawyer.routes.js     # 14 endpoints
│   │   ├── notification.routes.js # 12 endpoints
│   │   ├── reminder.routes.js   # 7 endpoints
│   │   ├── review.routes.js     # 2 endpoints
│   │   ├── user.routes.js       # 7 endpoints
│   │   └── webhook.routes.js    # 2 endpoints
│   ├── 📂 services/
│   │   ├── audit.service.js         # Audit logging
│   │   ├── chatbot.service.js       # Gemini AI integration
│   │   ├── meeting.service.js       # Jitsi Meet links
│   │   ├── notification.service.js  # Push notifications
│   │   ├── otp.service.js           # OTP management
│   │   ├── payment.service.js       # Razorpay integration
│   │   ├── sms.service.js           # Twilio SMS
│   │   ├── socket.service.js        # Socket.io events
│   │   ├── storage.service.js       # Supabase Storage
│   │   └── video.service.js         # Video meeting links
│   ├── 📂 validators/
│   │   ├── admin.validators.js
│   │   ├── auth.validators.js
│   │   ├── case.validators.js
│   │   ├── chat.validators.js
│   │   ├── common.validators.js
│   │   ├── consultation.validators.js
│   │   ├── lawyer.validators.js
│   │   ├── notification.validators.js
│   │   └── user.validators.js
│   └── index.js                 # Express app entry point
├── 📂 database/
│   ├── schema.sql               # Base PostgreSQL schema
│   └── 📂 migrations/
│       ├── 001_initial.sql
│       ├── 002_consultations.sql
│       ├── 003_chat.sql
│       ├── 004_video.sql
│       ├── 005_admin_enhancements.sql
│       ├── 006_schema_v2.sql
│       └── 007_production_features.sql
├── 📄 Dockerfile                # Multi-stage Docker build
├── 📄 docker-compose.yml        # Production compose
├── 📄 docker-compose.dev.yml    # Development compose
├── 📄 .env.example              # Environment template
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

## 📚 API Endpoints (124 Total)

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/detailed` | Detailed health with dependencies |
| GET | `/health/ready` | Kubernetes readiness probe |
| GET | `/health/live` | Kubernetes liveness probe |

### Authentication (`/api/v1/auth`) - 11 endpoints
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
| GET | `/google` | ❌ | Google OAuth redirect |
| GET | `/google/callback` | ❌ | Google OAuth callback |

### Users (`/api/v1/user`) - 7 endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/profile` | ✅ | Get user profile |
| PUT | `/profile` | ✅ | Update profile |
| PUT | `/change-password` | ✅ | Change password |
| DELETE | `/me` | ✅ | Delete account (requires confirmation) |
| GET | `/notification-preferences` | ✅ | Get notification settings |
| PUT | `/notification-preferences` | ✅ | Update notification settings |
| POST | `/data-export` | ✅ | Request GDPR data export |

### Lawyers (`/api/v1/lawyers`) - 14 endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | List verified lawyers |
| GET | `/search` | ❌ | Search lawyers with filters |
| GET | `/:lawyer_id` | ❌ | Get lawyer profile |
| GET | `/:lawyer_id/availability` | ❌ | Get available slots |
| PUT | `/availability` | ✅ 👨‍⚖️ | Set availability (lawyer only) |
| POST | `/register` | ✅ | Submit lawyer registration |
| GET | `/registration-status` | ✅ | Check registration status |
| PUT | `/registration` | ✅ | Update pending registration |
| DELETE | `/registration` | ✅ | Withdraw registration |
| GET | `/me` | ✅ 👨‍⚖️ | Get own lawyer profile |
| PUT | `/me` | ✅ 👨‍⚖️ | Update own profile |
| PUT | `/availability/bulk` | ✅ 👨‍⚖️ | Set weekly availability |
| POST | `/unavailability` | ✅ 👨‍⚖️ | Mark unavailable dates |
| GET | `/my-consultations` | ✅ 👨‍⚖️ | View consultations |
| GET | `/dashboard` | ✅ 👨‍⚖️ | Lawyer dashboard metrics |

### Consultations (`/api/v1/consultations`) - 12 endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/book` | ✅ | Book a consultation |
| POST | `/confirm-payment` | ✅ | Confirm Razorpay payment |
| GET | `/` | ✅ | List user's consultations |
| GET | `/:id` | ✅ | Get consultation details |
| GET | `/:id/details` | ✅ | Get full consultation info |
| POST | `/:id/cancel` | ✅ | Cancel consultation |
| POST | `/:id/complete` | ✅ 👨‍⚖️ | Mark as complete |
| PUT | `/:id/reschedule` | ✅ | Reschedule consultation |
| GET | `/:id/reschedule-history` | ✅ | View reschedule attempts |
| GET | `/:id/meeting` | ✅ | Get meeting link |
| POST | `/:id/join` | ✅ | Join video meeting |
| POST | `/:id/end` | ✅ 👨‍⚖️ | End video meeting |

### Chat (`/api/v1/chat`) - 16 endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/conversations` | ✅ | List conversations |
| POST | `/conversations` | ✅ | Create conversation |
| GET | `/conversations/:id` | ✅ | Get conversation |
| GET | `/conversations/:id/messages` | ✅ | Get messages |
| POST | `/conversations/:id/messages` | ✅ | Send message |
| PUT | `/conversations/:id/read` | ✅ | Mark as read |
| DELETE | `/conversations/:id` | ✅ | Delete conversation |
| POST | `/messages/:id/file` | ✅ | Upload file |
| GET | `/unread-count` | ✅ | Get unread count |
| PUT | `/messages/:id/read` | ✅ | Mark message read |
| DELETE | `/messages/:id` | ✅ | Delete message |
| GET | `/search` | ✅ | Search messages |
| POST | `/typing` | ✅ | Send typing indicator |
| GET | `/online-status/:userId` | ✅ | Check user online |
| PUT | `/conversations/:id/mute` | ✅ | Mute conversation |
| PUT | `/conversations/:id/archive` | ✅ | Archive conversation |

### Notifications (`/api/v1/notifications`) - 12 endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ | List notifications (with filters) |
| GET | `/unread-count` | ✅ | Get unread badge count |
| GET | `/:id` | ✅ | Get single notification |
| PUT | `/:id/read` | ✅ | Mark as read |
| PUT | `/read-multiple` | ✅ | Batch mark as read |
| PUT | `/read-all` | ✅ | Mark all as read |
| PUT | `/:id/archive` | ✅ | Archive notification |
| DELETE | `/:id` | ✅ | Delete notification |
| DELETE | `/bulk` | ✅ | Bulk delete |
| GET | `/preferences` | ✅ | Get notification preferences |
| PUT | `/preferences` | ✅ | Update preferences |
| POST | `/` | ✅ 🔑 | Admin: Create notification |

### Reviews (`/api/v1/reviews`) - 2 endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ✅ | Submit review |
| GET | `/lawyer/:lawyer_id` | ❌ | Get lawyer reviews |

### Cases (`/api/v1/cases`) - 5 endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ✅ | Add a case |
| GET | `/` | ✅ | List user's cases |
| GET | `/:id` | ✅ | Get case details |
| PUT | `/:id` | ✅ | Update case |
| DELETE | `/:id` | ✅ | Delete case |

### Reminders (`/api/v1/reminders`) - 7 endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ✅ | Create reminder |
| GET | `/` | ✅ | List reminders |
| GET | `/upcoming` | ✅ | Get upcoming reminders |
| GET | `/:id` | ✅ | Get reminder details |
| PUT | `/:id` | ✅ | Update reminder |
| DELETE | `/:id` | ✅ | Delete reminder |
| POST | `/:id/snooze` | ✅ | Snooze reminder |

### Chatbot (`/api/v1/chatbot`) - 3 endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/query` | ❌ | Send message to AI chatbot |
| POST | `/cost-estimate` | ❌ | Get legal cost estimate |
| GET | `/history/:session_id` | ❌ | Get chat history |

### Admin (`/api/v1/admin`) - 29 endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard` | ✅ 🔑 | Dashboard stats |
| GET | `/dashboard/revenue` | ✅ 🔑 | Revenue analytics |
| GET | `/dashboard/consultations` | ✅ 🔑 | Consultation metrics |
| GET | `/lawyers` | ✅ 🔑 | List all lawyers |
| GET | `/lawyers/pending` | ✅ 🔑 | Pending verifications |
| GET | `/lawyers/:id` | ✅ 🔑 | Lawyer details |
| PUT | `/lawyers/:id/verify` | ✅ 🔑 | Verify lawyer |
| PUT | `/lawyers/:id/reject` | ✅ 🔑 | Reject lawyer |
| PUT | `/lawyers/:id/suspend` | ✅ 🔑 | Suspend lawyer |
| PUT | `/lawyers/:id/unsuspend` | ✅ 🔑 | Unsuspend lawyer |
| GET | `/registrations` | ✅ 🔑 | Lawyer registrations |
| GET | `/registrations/:id` | ✅ 🔑 | Registration details |
| PUT | `/registrations/:id/approve` | ✅ 🔑 | Approve registration |
| PUT | `/registrations/:id/reject` | ✅ 🔑 | Reject registration |
| PUT | `/registrations/:id/request-changes` | ✅ 🔑 | Request changes |
| GET | `/users` | ✅ 🔑 | List all users |
| GET | `/users/:id` | ✅ 🔑 | User details |
| PUT | `/users/:id/ban` | ✅ 🔑 | Ban user |
| PUT | `/users/:id/unban` | ✅ 🔑 | Unban user |
| PUT | `/users/:id/role` | ✅ 🔑 | Change user role |
| GET | `/consultations` | ✅ 🔑 | List all consultations |
| GET | `/consultations/:id` | ✅ 🔑 | Consultation details |
| POST | `/consultations/:id/refund` | ✅ 🔑 | Process refund |
| GET | `/payments` | ✅ 🔑 | Payment history |
| GET | `/audit-logs` | ✅ 🔑 | View audit logs |
| GET | `/reports/daily` | ✅ 🔑 | Daily report |
| GET | `/reports/weekly` | ✅ 🔑 | Weekly report |
| GET | `/settings` | ✅ 🔑 | Platform settings |
| PUT | `/settings` | ✅ 🔑 | Update settings |

### Webhooks (`/webhooks`) - 2 endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/razorpay` | Razorpay payment webhooks |
| POST | `/twilio` | Twilio SMS status callbacks |

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

## 🔌 WebSocket Events

The API uses Socket.io for real-time features. Connect with authentication:

```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' }
});
```

### Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `chat:message` | ↔️ | Send/receive chat messages |
| `chat:typing` | ↔️ | Typing indicators |
| `chat:read` | ↔️ | Read receipts |
| `notification:new` | ⬇️ | New notification |
| `notification:count` | ⬇️ | Unread count update |
| `consultation:status` | ⬇️ | Consultation status change |
| `meeting:ready` | ⬇️ | Video meeting link ready |
| `meeting:started` | ⬇️ | Meeting has started |
| `user:online` | ⬇️ | User came online |
| `user:offline` | ⬇️ | User went offline |

## ⚡ Rate Limits

| Endpoint Type | Window | Max Requests |
|---------------|--------|--------------|
| General | 15 min | 100 |
| Auth | 1 min | 5 |
| OTP | 1 min | 3 |
| Search | 1 min | 30 |
| Chatbot | 1 min | 20 |
| Chat Messages | 1 min | 60 |
| File Upload | 1 min | 10 |
| Admin | 15 min | 200 |
| Webhooks | No limit | - |

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
- [ ] Set up Redis with password
- [ ] Configure Jitsi Meet domain (optional)
- [ ] Run all database migrations

### Environment Variables

```env
# Required for production
NODE_ENV=production
FRONTEND_URL=https://your-frontend.com

# Video Calls (optional - uses 8x8.vc by default)
JITSI_DOMAIN=meet.jit.si
JITSI_APP_ID=your-app-id
JITSI_API_KEY=your-api-key
```

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
- ✅ JWT token validation
- ✅ Role-based access control (user/lawyer/admin)
- ✅ Account deletion with audit trail
- ✅ GDPR-compliant data export

## 📊 Database Schema

The application uses 15+ tables including:

| Table | Purpose |
|-------|---------|
| `users` | User accounts and profiles |
| `lawyers` | Verified lawyer profiles |
| `lawyer_registration_requests` | Pending lawyer applications |
| `consultations` | Booked consultations |
| `consultation_reschedules` | Reschedule history |
| `payments` | Payment records |
| `conversations` | Chat conversations |
| `messages` | Chat messages |
| `notifications` | In-app notifications |
| `cases` | User's court cases |
| `reminders` | Hearing reminders |
| `reviews` | Lawyer reviews |
| `audit_logs` | Admin action logs |
| `chatbot_sessions` | AI chatbot history |

Run migrations in order:
```bash
# Via Supabase Dashboard SQL Editor
database/migrations/001_initial.sql
database/migrations/002_consultations.sql
database/migrations/003_chat.sql
database/migrations/004_video.sql
database/migrations/005_admin_enhancements.sql
database/migrations/006_schema_v2.sql
database/migrations/007_production_features.sql
```

## 📄 License

MIT License

## 👥 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🆘 Support

- 📧 Email: raunakj@gmail.com
- 📖 Docs: [API Documentation](https://docs.nyaaysaathi.com)
- 🐛 Issues: [GitHub Issues](https://github.com/nyaaysaathi/api/issues)

## 📈 API Stats

| Metric | Value |
|--------|-------|
| Total Endpoints | **124** |
| Route Files | 13 |
| Controllers | 12 |
| Services | 10 |
| Validators | 9 |
| Database Tables | 15+ |
| WebSocket Events | 10+ |

---

<div align="center">

Made with ❤️ for access to justice in India

**[⬆ Back to Top](#nyaay-saathi---legal-services-platform-api)**

</div>
