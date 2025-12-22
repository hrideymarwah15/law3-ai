# 📚 Nyaay Saathi API - Postman Collection

A comprehensive Postman collection for testing all 124+ API endpoints of the Nyaay Saathi legal consultation platform.

## 📁 Files Included

| File | Description |
|------|-------------|
| `Nyaay_Saathi_API.postman_collection.json` | Complete API collection with all endpoints |
| `Nyaay_Saathi.postman_environment.json` | Local development environment variables |
| `Nyaay_Saathi_Production.postman_environment.json` | Production environment variables |

## 🚀 Quick Start

### 1. Import into Postman
1. Open Postman
2. Click **Import** (top-left)
3. Drag and drop both files:
   - `Nyaay_Saathi_API.postman_collection.json`
   - `Nyaay_Saathi.postman_environment.json`

### 2. Select Environment
- Click the environment dropdown (top-right)
- Select **"Nyaay Saathi - Local"**

### 3. Start Testing
- Run the **Health > Basic Health Check** endpoint first to verify server connection
- **For Email/Password auth:**
  1. Run `Auth > Signup (Email)` to create account
  2. Run `Auth > Signin (Email/Password)` to get tokens
- **For OTP auth (passwordless):**
  1. Run `Auth > Request OTP` with your phone number
  2. Run `Auth > Verify OTP` with the code received
- Tokens are automatically saved to `{{access_token}}` variable!
- All subsequent requests will use the token automatically

## 📂 Collection Structure

```
📦 Nyaay Saathi API
├── 🏥 Health (4 endpoints)
│   ├── Health Check
│   ├── Server Info
│   ├── Ping
│   └── Readiness Check
│
├── 🔐 Auth (12 endpoints)
│   ├── Send OTP
│   ├── Verify OTP
│   ├── Refresh Token
│   ├── Logout
│   ├── Google OAuth
│   ├── Google Callback
│   ├── Check User Exists
│   └── Verify Session
│
├── 👤 User (7 endpoints)
│   ├── Get Profile
│   ├── Update Profile
│   ├── Upload Avatar
│   ├── Get Activity
│   ├── Get Preferences
│   ├── Update Preferences
│   └── Delete Account
│
├── ⚖️ Lawyers (14 endpoints)
│   ├── Search Lawyers
│   ├── Get Lawyer Profile
│   ├── Get Availability
│   ├── Update Availability
│   ├── Verify Lawyer
│   ├── Check Availability
│   └── Review endpoints...
│
├── 📅 Consultations (11 endpoints)
│   ├── Create Consultation
│   ├── Get My Consultations
│   ├── Get Consultation Details
│   ├── Update Status
│   ├── Cancel Consultation
│   ├── Reschedule
│   └── Payment endpoints...
│
├── 💬 Chat (16 endpoints)
│   ├── Create/Get Room
│   ├── Send Message
│   ├── Get Messages
│   ├── Upload Attachment
│   ├── Mark Read
│   ├── Typing Indicators
│   └── More...
│
├── 🤖 Chatbot (6 endpoints)
│   ├── Create Session
│   ├── Send Message
│   ├── Get History
│   ├── Clear History
│   └── AI Analysis...
│
├── 🔔 Notifications (12 endpoints)
│   ├── Get Notifications
│   ├── Mark Read/Unread
│   ├── Delete
│   ├── Preferences
│   └── Push Token...
│
├── ⭐ Reviews (2 endpoints)
│   ├── Submit Review
│   └── Get Lawyer Reviews
│
├── 📁 Cases (5 endpoints)
│   ├── Create Case
│   ├── List My Cases
│   ├── Get Case Details
│   ├── Update Case
│   └── Delete Case
│
├── ⏰ Reminders (7 endpoints)
│   ├── Create Reminder
│   ├── Get Reminders
│   ├── Update/Delete
│   └── Process Due...
│
├── 👑 Admin (25+ endpoints)
│   ├── 📊 Dashboard
│   ├── 👨‍⚖️ Lawyer Management
│   ├── 👥 User Management
│   ├── 📋 Consultations
│   ├── 💰 Revenue
│   ├── 📢 Announcements
│   ├── ⚠️ Disputes
│   ├── 💳 Refunds
│   ├── ⚙️ Settings
│   ├── 📤 Notifications
│   ├── 📊 Reports
│   └── 📜 Audit Logs
│
└── 🔗 Webhooks
    ├── Razorpay Webhook
    └── Supabase Webhook
```

## 🔑 Authentication Flow

The collection includes automatic token management:

1. **Send OTP** → Sends OTP to phone number
2. **Verify OTP** → Returns tokens + auto-saves to environment:
   - `{{access_token}}`
   - `{{refresh_token}}`
   - `{{user_id}}`
3. All subsequent requests automatically use `{{access_token}}`

### Test Scripts
All auth endpoints include test scripts that automatically:
- ✅ Save `access_token` and `refresh_token`
- ✅ Save `user_id` from response
- ✅ Handle token refresh automatically

## 🔧 Environment Variables

| Variable | Description | Auto-Saved |
|----------|-------------|------------|
| `base_url` | API base URL | ❌ |
| `api_version` | API version (v1) | ❌ |
| `access_token` | JWT access token | ✅ |
| `refresh_token` | JWT refresh token | ✅ |
| `user_id` | Current user ID | ✅ |
| `lawyer_id` | Selected lawyer ID | ✅ |
| `consultation_id` | Active consultation ID | ✅ |
| `room_id` | Chat room ID | ✅ |
| `message_id` | Message ID | ❌ |
| `notification_id` | Notification ID | ❌ |
| `session_id` | Chatbot session ID | ✅ |
| `case_id` | Case ID | ❌ |
| `reminder_id` | Reminder ID | ❌ |
| `test_phone` | Test phone number | ❌ |
| `test_email` | Test email | ❌ |

## 📝 Request Examples

### Create Consultation
```json
POST /api/v1/consultations

{
  "lawyer_id": "{{lawyer_id}}",
  "scheduled_at": "2025-01-25T10:00:00Z",
  "duration_minutes": 30,
  "consultation_type": "video",
  "description": "Property dispute consultation",
  "legal_issue_category": "property"
}
```

### AI Chatbot Message
```json
POST /api/v1/chatbot/message

{
  "session_id": "{{session_id}}",
  "message": "What are my rights as a tenant in India?",
  "context": {
    "location": "Maharashtra"
  }
}
```

## 🧪 Testing Workflow

### Basic Flow
1. **Health** → Verify server is running
2. **Auth** → Get authenticated
3. **Lawyers** → Search and select a lawyer
4. **Consultations** → Book a consultation
5. **Chat** → Send messages
6. **Reviews** → Leave a review

### Admin Flow
1. Login as admin user
2. **Admin/Dashboard** → View metrics
3. **Admin/Lawyers** → Verify pending lawyers
4. **Admin/Disputes** → Handle user disputes

## 🔒 Authorization Levels

| Endpoint Group | Required Role |
|----------------|---------------|
| Health | None |
| Auth | None |
| User | Authenticated |
| Lawyers | Authenticated |
| Consultations | Authenticated |
| Chat | Authenticated |
| Chatbot | Authenticated |
| Notifications | Authenticated |
| Reviews | Authenticated |
| Cases | Authenticated |
| Reminders | Authenticated |
| Admin | Admin Role |
| Webhooks | Signature Verification |

## 💡 Tips

1. **Run in Order**: Use the Collection Runner to run folders in sequence
2. **Check Console**: Use Postman Console (Cmd/Ctrl + Alt + C) for debugging
3. **Variables**: Double-click variables to see current values
4. **Quick Switch**: Use Cmd/Ctrl + E to quickly switch environments

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Run auth flow again, token may be expired |
| 404 Not Found | Check if `base_url` is correct |
| 429 Rate Limited | Wait a few seconds and retry |
| Empty Response | Check server logs for errors |

## 📞 Support

For API issues, check:
- Server logs: `docker logs nyaay-saathi-api`
- API docs: `{{base_url}}/api-docs`
- Health: `{{base_url}}/health`

---

**Happy Testing! 🎉**
