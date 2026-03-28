# Friedays Authentication - Quick Reference Implementation Guide

**Purpose**: Fast lookup guide for developers implementing the authentication system  
**Target**: Backend developers, DevOps engineers  
**Status**: Ready to implement

---

## Quick Setup Checklist

### 1. Database Setup (PostgreSQL)

```sql
-- Run these in order

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  email_verified_at TIMESTAMP NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  phone_secondary VARCHAR(20),
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country CHAR(2) NOT NULL,
  address_notes TEXT,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted_at TIMESTAMP NOT NULL,
  privacy_accepted_at TIMESTAMP NOT NULL,
  oauth_provider VARCHAR(50),
  oauth_provider_id VARCHAR(128),
  account_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  account_locked_until TIMESTAMP,
  failed_login_count INT NOT NULL DEFAULT 0,
  tier VARCHAR(20) NOT NULL DEFAULT 'BRONZE',
  loyalty_points INT NOT NULL DEFAULT 0,
  total_spent DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_provider_id);

-- Create password reset tokens table
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  requested_ip VARCHAR(45),
  user_agent VARCHAR(255)
);

CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- Create email verification tokens table
CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verification_tokens_user ON email_verification_tokens(user_id);

-- Create login attempts table
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  success BOOLEAN NOT NULL,
  attempted_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_login_attempts_email ON login_attempts(email, attempted_at DESC);
```

### 2. Environment Variables

```bash
# .env file
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/friedays

# JWT/Sessions
SESSION_SECRET=your-super-secret-session-key-min-32-chars
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRY=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@friedays.com

# OAuth - Google
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://app.friedays.com/auth/google/callback

# OAuth - Facebook
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
FACEBOOK_REDIRECT_URI=https://app.friedays.com/auth/facebook/callback

# Security
BCRYPT_ROUNDS=12
PASSWORD_RESET_EXPIRY_MINUTES=30
EMAIL_VERIFICATION_EXPIRY_HOURS=24
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_ATTEMPTS=5
RATE_LIMIT_LOCKOUT_MINUTES=30
```

### 3. Dependencies (npm)

```bash
npm install express bcrypt jsonwebtoken dotenv pg
npm install nodemailer validator isomorphic-dompurify
npm install libphonenumber-js
npm install express-session connect-pg-simple
npm install csurf helmet cors
npm install express-rate-limit
npm install google-auth-library
npm install axios
```

---

## Core Authentication Functions

### Password Management

```javascript
// auth/password.js
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

export function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

export function validatePasswordStrength(password) {
  const errors = [];
  
  if (password.length < 8) errors.push('At least 8 characters required');
  if (!/[A-Z]/.test(password)) errors.push('Must contain uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Must contain lowercase letter');
  if (!/\d/.test(password)) errors.push('Must contain number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Must contain special character');
  }
  
  return { valid: errors.length === 0, errors };
}
```

### Database Access

```javascript
// db/pool.js
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    console.log('Query duration:', Date.now() - start, 'ms');
    return res.rows;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

export async function getClient() {
  return pool.connect();
}

export default pool;
```

### User Registration

```javascript
// routes/auth.js
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import validator from 'validator';
import { hashPassword, generateToken, validatePasswordStrength } from '../auth/password.js';
import { query } from '../db/pool.js';
import { sendVerificationEmail } from '../email/sender.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      password_confirm,
      first_name,
      last_name,
      phone,
      address_line1,
      city,
      postal_code,
      country,
      terms_accepted,
      privacy_accepted,
    } = req.body;

    // Validate required fields
    if (!email || !password || !first_name || !last_name || !phone || !address_line1 || !city || !postal_code || !country) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate email
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate passwords match
    if (password !== password_confirm) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Check password strength
    const { valid, errors: passwordErrors } = validatePasswordStrength(password);
    if (!valid) {
      return res.status(400).json({ errors: passwordErrors });
    }

    // Validate acceptance
    if (!terms_accepted || !privacy_accepted) {
      return res.status(400).json({ error: 'You must accept Terms & Conditions and Privacy Policy' });
    }

    // Check email uniqueness
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1', [email.toLowerCase()]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = uuidv4();
    const now = new Date();

    await query(
      `INSERT INTO users (
        id, email, password_hash, first_name, last_name, phone,
        address_line1, city, postal_code, country,
        terms_accepted_at, privacy_accepted_at, account_status, tier,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        userId, email.toLowerCase(), passwordHash, first_name, last_name, phone,
        address_line1, city, postal_code, country.toUpperCase(),
        now, now, 'pending', 'BRONZE', now, now,
      ]
    );

    // Generate verification token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(
      'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );

    // Send verification email
    const verifyUrl = `https://app.friedays.com/verify-email?token=${token}`;
    await sendVerificationEmail(email, first_name, verifyUrl);

    res.status(201).json({
      message: 'Account created. Check your email to verify.',
      user: { id: userId, email, tier: 'BRONZE' },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

export default router;
```

### User Login

```javascript
// routes/login.js
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check account lockout
    const user = await query(
      'SELECT * FROM users WHERE LOWER(email) = $1',
      [email.toLowerCase()]
    );

    if (user.length === 0) {
      // Still record attempt
      await query(
        'INSERT INTO login_attempts (email, ip_address, success, attempted_at) VALUES ($1, $2, $3, NOW())',
        [email, ipAddress, false]
      );
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userRecord = user[0];

    // Check if locked
    if (userRecord.account_locked_until && userRecord.account_locked_until > new Date()) {
      const remainingMinutes = Math.ceil((userRecord.account_locked_until - new Date()) / 60000);
      return res.status(403).json({
        error: `Account locked. Try again in ${remainingMinutes} minutes.`,
      });
    }

    // Check email verified
    if (!userRecord.email_verified_at) {
      return res.status(403).json({ error: 'Please verify your email first' });
    }

    // Verify password
    const passwordMatch = await verifyPassword(password, userRecord.password_hash);

    if (!passwordMatch) {
      // Record failed attempt
      await query(
        'INSERT INTO login_attempts (user_id, email, ip_address, success, attempted_at) VALUES ($1, $2, $3, $4, NOW())',
        [userRecord.id, email, ipAddress, false]
      );

      // Check if should lock
      const recentFailures = await query(
        `SELECT COUNT(*) as count FROM login_attempts
         WHERE email = $1 AND attempted_at > NOW() - INTERVAL '15 minutes' AND success = false`,
        [email]
      );

      if (recentFailures[0].count >= 5) {
        const unlockTime = new Date(Date.now() + 30 * 60 * 1000);
        await query(
          'UPDATE users SET account_locked_until = $1 WHERE id = $2',
          [unlockTime, userRecord.id]
        );
        return res.status(429).json({ error: 'Account locked due to failed attempts' });
      }

      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Success! Record attempt
    await query(
      'INSERT INTO login_attempts (user_id, email, ip_address, success, attempted_at) VALUES ($1, $2, $3, $4, NOW())',
      [userRecord.id, email, ipAddress, true]
    );

    // Update last login
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userRecord.id]);

    // Create session
    req.session.user_id = userRecord.id;
    req.session.email = userRecord.email;
    req.session.tier = userRecord.tier;

    res.json({
      message: 'Login successful',
      user: {
        id: userRecord.id,
        email: userRecord.email,
        tier: userRecord.tier,
        loyalty_points: userRecord.loyalty_points,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});
```

### Password Reset

```javascript
// routes/password-reset.js
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const ipAddress = req.ip;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Rate limit: 3 per 15 minutes (generic response)
    const recentResets = await query(
      `SELECT COUNT(*) as count FROM password_reset_tokens
       WHERE user_id = (SELECT id FROM users WHERE LOWER(email) = $1)
       AND created_at > NOW() - INTERVAL '15 minutes'`,
      [email.toLowerCase()]
    );

    if (recentResets[0]?.count >= 3) {
      return res.status(429).json({
        message: 'Too many reset requests. Try again later.',
      });
    }

    // Find user (generic response either way)
    const user = await query(
      'SELECT id, first_name FROM users WHERE LOWER(email) = $1',
      [email.toLowerCase()]
    );

    if (user.length > 0) {
      const token = generateToken(32);
      const hash = hashToken(token);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, requested_ip)
         VALUES ($1, $2, $3, $4)`,
        [user[0].id, hash, expiresAt, ipAddress]
      );

      const resetUrl = `https://app.friedays.com/reset-password?token=${token}`;
      await sendPasswordResetEmail(email, user[0].first_name, resetUrl);
    }

    res.json({ message: 'If email exists, reset link sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password, password_confirm } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    if (password !== password_confirm) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const { valid, errors } = validatePasswordStrength(password);
    if (!valid) {
      return res.status(400).json({ errors });
    }

    const tokenHash = hashToken(token);
    const tokenRecord = await query(
      `SELECT user_id, expires_at, used_at FROM password_reset_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );

    if (!tokenRecord || tokenRecord[0].used_at) {
      return res.status(400).json({ error: 'Invalid or used token' });
    }

    if (tokenRecord[0].expires_at < new Date()) {
      return res.status(400).json({ error: 'Token expired' });
    }

    const passwordHash = await hashPassword(password);
    const userId = tokenRecord[0].user_id;

    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      passwordHash,
      userId,
    ]);

    await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1', [
      tokenHash,
    ]);

    res.json({ message: 'Password reset successful. Login now.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Reset failed' });
  }
});
```

### Email Verification

```javascript
// routes/email-verification.js
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const tokenRecord = await query(
      `SELECT user_id, expires_at, used_at FROM email_verification_tokens
       WHERE token = $1`,
      [token]
    );

    if (!tokenRecord || tokenRecord[0].used_at) {
      return res.status(400).json({ error: 'Invalid or used token' });
    }

    if (tokenRecord[0].expires_at < new Date()) {
      return res.status(400).json({ error: 'Token expired' });
    }

    const userId = tokenRecord[0].user_id;

    await query('UPDATE users SET email_verified_at = NOW(), account_status = $1 WHERE id = $2', [
      'active',
      userId,
    ]);

    await query('UPDATE email_verification_tokens SET used_at = NOW() WHERE token = $1', [token]);

    res.json({ message: 'Email verified! You can now login.' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});
```

### Google OAuth

```javascript
// routes/oauth-google.js
import { OAuth2Client } from 'google-auth-library';

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

router.get('/google', (req, res) => {
  const scopes = ['openid', 'email', 'profile'];

  // Generate state for CSRF protection
  const state = generateToken(16);
  req.session.oauth_state = state;

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state,
    prompt: 'consent',
  });

  res.redirect(authUrl);
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    // Verify state
    if (state !== req.session.oauth_state) {
      return res.status(401).json({ error: 'CSRF validation failed' });
    }

    // Get tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload.email_verified) {
      return res.status(403).json({ error: 'Email not verified by Google' });
    }

    // Check/create user
    let user = await query(
      'SELECT id FROM users WHERE LOWER(email) = $1 OR (oauth_provider = $2 AND oauth_provider_id = $3)',
      [payload.email.toLowerCase(), 'google', payload.sub]
    );

    if (user.length === 0) {
      // Create new user
      const userId = uuidv4();
      const now = new Date();

      await query(
        `INSERT INTO users (
          id, email, first_name, last_name, oauth_provider, oauth_provider_id,
          email_verified_at, account_status, tier, terms_accepted_at, privacy_accepted_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          userId,
          payload.email.toLowerCase(),
          payload.given_name || 'User',
          payload.family_name || '',
          'google',
          payload.sub,
          now,
          'active',
          'BRONZE',
          now,
          now,
          now,
          now,
        ]
      );

      user = [{ id: userId }];
    }

    // Create session
    req.session.user_id = user[0].id;

    res.redirect('/account');
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: 'OAuth failed' });
  }
});
```

---

## Testing Quick Commands

```bash
# Test email verification token generation
curl -X POST http://localhost:3000/api/test/generate-token

# Test password hashing
curl -X POST http://localhost:3000/api/test/hash-password \
  -H "Content-Type: application/json" \
  -d '{"password":"TestPassword123!"}'

# Test rate limiting
for i in {1..6}; do
  curl -X POST http://localhost:3000/auth/forgot-password \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}'
done

# Check database connections
curl http://localhost:3000/api/health
```

---

## Deployment Checklist

- [ ] All secrets in environment variables
- [ ] Database backups automated
- [ ] HTTPS enabled with valid certificate
- [ ] Email service configured (Gmail/SendGrid/AWS SES)
- [ ] OAuth credentials generated and tested
- [ ] Rate limiting configured
- [ ] Monitoring/alerting active
- [ ] Logs aggregated (CloudWatch/ELK)
- [ ] CORS properly configured
- [ ] CSRF protection enabled
- [ ] Secure cookies set
- [ ] Database migrations run
- [ ] Load testing completed
- [ ] Penetration testing scheduled
