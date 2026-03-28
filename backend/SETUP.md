# Friedays Authentication System - Backend Setup Guide

## Quick Start

### 1. Prerequisites
- Node.js v16+ installed
- PostgreSQL 12+ installed and running
- npm or yarn

### 2. Installation

```bash
cd backend
npm install
```

### 3. Database Setup

#### Option A: Using PostgreSQL CLI directly

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE friedays_db;

# Create user
CREATE USER friedays_user WITH PASSWORD 'your_password_here';

# Grant privileges
ALTER ROLE friedays_user SET client_encoding TO 'utf8';
ALTER ROLE friedays_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE friedays_user SET default_transaction_deferrable TO on;
ALTER ROLE friedays_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE friedays_db TO friedays_user;
\connect friedays_db
GRANT ALL PRIVILEGES ON SCHEMA public TO friedays_user;

# Quit
\q
```

#### Option B: Using a PostgreSQL GUI (pgAdmin)

1. Create database: `friedays_db`
2. Create user: `friedays_user` with password
3. Grant all privileges to this user on the database

### 4. Environment Configuration

```bash
# Copy example to actual .env
cp .env.example .env

# Edit .env with your configuration
nano .env  # or use your favorite editor
```

**Key settings to update in .env:**
```
DATABASE_URL=postgresql://friedays_user:your_password@localhost:5432/friedays_db
JWT_SECRET=your-super-secret-key-change-in-production
SESSION_SECRET=your-session-secret-key
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 5. Start the Backend Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

You should see:
```
╔════════════════════════════════════════╗
║   🍗 FRIEDAYS AUTH SERVER RUNNING 🍗  ║
╠════════════════════════════════════════╣
║                                        ║
║  Server: http://localhost:5000         ║
║  Environment: development              ║
...
```

### 6. Test the API

```bash
# Health check
curl http://localhost:5000/health

# Register
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "password_confirm": "TestPass123!",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "address_line1": "123 Main St",
    "city": "New York",
    "postal_code": "10001",
    "country": "US",
    "terms_accepted": true,
    "privacy_accepted": true
  }'
```

---

## Environment Variables Reference

### Database
- `DATABASE_URL`: PostgreSQL connection string

### Security
- `JWT_SECRET`: Secret key for JWT tokens (min 32 characters recommended)
- `SESSION_SECRET`: Secret key for sessions
- `JWT_EXPIRY`: Token expiration (default: 7d)
- `BCRYPT_ROUNDS`: Bcrypt cost factor (default: 12)

### Email Configuration
- `SMTP_HOST`: Email server host (e.g., smtp.gmail.com)
- `SMTP_PORT`: Email server port (e.g., 587 for TLS)
- `SMTP_USER`: Email account username
- `SMTP_PASS`: Email account password (use app-specific password for Gmail)
- `SMTP_FROM`: From address for emails

### OAuth - Google
- `GOOGLE_CLIENT_ID`: OAuth 2.0 Client ID
- `GOOGLE_CLIENT_SECRET`: OAuth 2.0 Client Secret
- `GOOGLE_REDIRECT_URI`: Redirect URL after authentication

### OAuth - Facebook
- `FACEBOOK_APP_ID`: Facebook App ID
- `FACEBOOK_APP_SECRET`: Facebook App Secret
- `FACEBOOK_REDIRECT_URI`: Redirect URL after authentication

### Rate Limiting & Security
- `MAX_LOGIN_ATTEMPTS`: Failed attempts before lockout (default: 5)
- `LOGIN_ATTEMPT_WINDOW_MINUTES`: Time window for attempts (default: 15)
- `ACCOUNT_LOCKOUT_MINUTES`: Lockout duration (default: 30)
- `PASSWORD_RESET_EXPIRY_MINUTES`: Reset token validity (default: 30)
- `EMAIL_VERIFICATION_EXPIRY_HOURS`: Email verification token validity (default: 24)

### Application
- `APP_NAME`: Application name
- `APP_URL`: Frontend URL (used for email links)
- `CORS_ORIGIN`: Allowed CORS origins (comma-separated)

---

## Email Configuration

### Gmail Setup

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select Mail and Windows Computer
   - Generate a 16-character password
3. Use this password in `SMTP_PASS`

### Other Email Providers

Add SMTP configuration for your provider:
- SendGrid: smtp.sendgrid.net:587
- AWS SES: email-smtp.{region}.amazonaws.com:587
- Mailgun: smtp.mailgun.org:587

---

## API Endpoints

### Authentication

**POST `/auth/register`**
- Register a new user account
- Body: `{ email, password, first_name, last_name, phone, address_line1, city, postal_code, country, terms_accepted, privacy_accepted }`

**POST `/auth/login`**
- Login user
- Body: `{ email, password }`

**GET `/auth/verify-email?token=TOKEN`**
- Verify email address

**POST `/auth/forgot-password`**
- Request password reset
- Body: `{ email }`

**POST `/auth/reset-password`**
- Complete password reset
- Body: `{ token, password, password_confirm }`

### User Profile

**GET `/api/users/me`** (requires token)
- Get current user profile
- Header: `Authorization: Bearer TOKEN`

**PUT `/api/users/me`** (requires token)
- Update user profile
- Header: `Authorization: Bearer TOKEN`

---

## Troubleshooting

### "Cannot find module" errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Database connection errors

```bash
# Test connection
psql -U friedays_user -d friedays_db -h localhost -c "SELECT 1"

# Check if PostgreSQL is running
# On Mac: brew services list
# On Linux: sudo systemctl status postgresql
# On Windows: Services > PostgreSQL
```

### Email not sending

1. Check SMTP credentials in .env
2. For Gmail: Verify app password is correct
3. Check firewall/antivirus blocking SMTP port
4. Enable "Less secure app access" (if not using app passwords)

### CORS errors

Update `CORS_ORIGIN` in .env:
```
CORS_ORIGIN=http://localhost:3000,http://localhost:8000,https://yourdomain.com
```

### Port already in use

Change port in .env or kill process:
```bash
# Find what's using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

---

## Production Deployment

### Before Going Live

- [ ] Change all secrets in .env
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS
- [ ] Set up database backups
- [ ] Configure logging service
- [ ] Set up monitoring/alerts
- [ ] Run security audit
- [ ] Test all email templates
- [ ] Verify OAuth credentials

### Deployment Commands

```bash
# Build dependencies
npm install --production

# Run migrations (if needed)
npm run migrate

# Start server
NODE_ENV=production npm start
```

---

## File Structure

```
backend/
├── db/
│   ├── init.js              # Database initialization
│   └── pool.js              # Database connection pool
├── middleware/
│   └── errorHandler.js      # Global error handling
├── routes/
│   ├── auth.js              # Authentication endpoints
│   └── users.js             # User profile endpoints
├── utils/
│   ├── auth.js              # Auth utilities (hashing, validation)
│   └── email.js             # Email sending templates
├── server.js                # Express server
├── package.json             # Dependencies
└── .env.example             # Environment template
```

---

## Next Steps

1. ✅ Backend setup complete
2. 📝 Update frontend API_BASE_URL in `js/auth.js` if needed
3. 🔐 Configure OAuth providers
4. 📧 Test email sending
5. 🚀 Deploy to production

For more details, see `/assets/md/AUTHENTICATION_SYSTEM.md` and `/assets/md/AUTHENTICATION_QUICK_REFERENCE.md`.
