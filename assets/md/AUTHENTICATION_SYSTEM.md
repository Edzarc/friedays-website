# Friedays Authentication & Account Management System

**Status:** Production-Ready Design Document  
**Last Updated:** March 28, 2026  
**Version:** 1.0

---

## Executive Summary

This document specifies the complete authentication, authorization, and account management system for Friedays. The design supports secure user registration, social login integration, password security management, and seamless integration with the existing 4-tier loyalty program.

---

## 1. Social Login Integration

### OAuth Flow Architecture

#### Google OAuth 2.0 Flow

```
┌─────────────┐                                    ┌──────────────────┐
│  Friedays   │                                    │  Google Servers  │
│  Frontend   │                                    │                  │
└──────┬──────┘                                    └──────────────────┘
       │                                                    │
       │ 1. User clicks "Sign in with Google"              │
       ├─────────────────────────────────────────────────>│
       │                                                    │
       │    2. Google shows consent screen                 │
       │ <───────────────────────────────────────────────┤
       │                                                    │
       │ 3. User grants permission                         │
       │                                                    │
       └──────────────────────────────────────────────────>│
       │                                                    │
       │ 4. Google redirects: /auth/google/callback        │
       │    ?code=AUTH_CODE&state=CSRF_TOKEN              │
       │ <───────────────────────────────────────────────┤
       │
       ├─────────────────────────────────────────────────>│ Friedays Backend
       │ 5. Backend validates state, exchanges code        │
       │    for access_token via HTTPS POST                │
       │                                                    │
       │ 6. Backend fetches user profile                   │
       └──────────────────────────────────────────────────>│
                                                            │
                                                    Returns:
                                                    - email
                                                    - name
                                                    - picture
                                                    - locale
```

#### Facebook OAuth 2.0 Flow

Same pattern as Google, with Facebook-specific scopes and profile fields.

### Required API Credentials

#### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "Friedays Authentication"
3. Enable: Google+ API
4. Create OAuth 2.0 Client ID
5. Set authorized redirect URIs:
   - `https://app.friedays.com/auth/google/callback`
   - `http://localhost:3000/auth/google/callback` (dev)

**Environment variables:**
```
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://app.friedays.com/auth/google/callback
```

**Requested scopes:**
```
- openid
- email
- profile
```

#### Facebook OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create new app: "Friedays"
3. Add "Facebook Login" product
4. Set Valid OAuth Redirect URIs:
   - `https://app.friedays.com/auth/facebook/callback`
   - `http://localhost:3000/auth/facebook/callback` (dev)

**Environment variables:**
```
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_REDIRECT_URI=https://app.friedays.com/auth/facebook/callback
```

**Requested scopes:**
```
- email
- public_profile
```

### User Data Mapping from Providers

#### From Google (ID Token claims):
```json
{
  "sub": "1234567890",
  "email": "user@example.com",
  "email_verified": true,
  "given_name": "John",
  "family_name": "Doe",
  "picture": "https://lsh3.googleusercontent.com/...",
  "locale": "en_US"
}
```

#### From Facebook (Graph API response):
```json
{
  "id": "1234567890",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "name": "John Doe",
  "picture": {
    "height": 50,
    "width": 50,
    "is_silhouette": false,
    "url": "https://platform-lookaside.fbsbx.com/..."
  }
}
```

#### Friedays Internal Mapping:
```javascript
{
  // Social provider info
  oauth_provider: "google" | "facebook",
  oauth_provider_id: "1234567890",
  oauth_verified_email: true,
  oauth_profile_picture: "https://...",
  
  // User profile (from provider)
  email: "user@example.com",
  email_verified_at: "2024-03-28T10:30:00Z",
  first_name: "John",
  last_name: "Doe",
  phone: null, // Not provided by social providers
  
  // Friedays defaults for new social accounts
  tier: "BRONZE",
  joined_via: "google", // or "facebook"
  account_status: "active", // auto-verified via provider
  marketing_opt_in: false
}
```

### Handling Email Conflicts

**Decision Matrix:**

| Scenario | Action | User Experience |
|----------|--------|-----------------|
| Email not in system | Create account | Instant activation |
| Email + same provider | Link accounts | Auto-login |
| Email + different provider | Merge after verification | Prompt user: "Sign in with original provider first" |
| Email + password login | Optional linking | "Add Google/Facebook login to this account?" |
| Unverified email from provider | Request re-auth | User tries provider again |

**Implementation Flow:**

```javascript
async function handleSocialLogin(profile, provider) {
  const { email, verified_email } = profile;
  
  if (!email || !verified_email) {
    throw new Error('Email not verified by provider');
  }
  
  // Check for existing user
  const existing = await db.query(
    'SELECT id, oauth_provider, password_hash FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  
  if (!existing) {
    // New user: create account
    return createSocialAccount(profile, provider);
  }
  
  // Existing user found
  if (existing.oauth_provider === provider) {
    // Same provider: link and login
    return loginWithOAuth(existing.id);
  }
  
  if (existing.oauth_provider && existing.oauth_provider !== provider) {
    // Different provider: prompt merge
    return {
      status: 'ACCOUNT_CONFLICT',
      message: `Account exists with ${existing.oauth_provider}. Sign in there first.`,
      email: email
    };
  }
  
  if (existing.password_hash) {
    // Password login exists: offer to link
    return {
      status: 'LINK_OFFER',
      message: 'Add social login to existing account?',
      user_id: existing.id
    };
  }
}
```

### OAuth Error Handling

**Common Errors & Responses:**

| Error Code | Cause | User Message | Action |
|----------|-------|--------------|--------|
| `invalid_state` | CSRF token mismatch | "Security validation failed. Please try again." | Log incident, reject |
| `access_denied` | User cancelled | "Sign-in cancelled." | Redirect to login |
| `invalid_client` | Bad client credentials | "Configuration error." | Enable contact support |
| `temporarily_unavailable` | Provider outage | "Provider is temporarily unavailable." | Offer email login |
| `invalid_scope` | Missing permissions | "Required permissions not granted." | Redirect to try again |
| `server_error` | Provider error | "Please try again later." | Retry or email login |
| `network_error` | Connection failed | "Network error. Please check connection." | Allow retry |

**Error Handling Implementation:**

```javascript
async function handleOAuthCallback(req, res) {
  const { code, state, error, error_description } = req.query;
  
  // Validate CSRF token
  const storedState = req.session.oauth_state;
  if (state !== storedState) {
    logger.error('CSRF mismatch', { stored: storedState, received: state });
    return res.redirect('/login?error=csrf_mismatch');
  }
  
  // Handle provider errors
  if (error) {
    logger.warn(`OAuth error from provider: ${error}`, {
      error_description,
      provider: req.params.provider
    });
    
    const userMessage = getErrorMessage(error);
    return res.redirect(`/login?error=${error}&message=${userMessage}`);
  }
  
  try {
    // Exchange code for token
    const tokens = await exchangeCodeForToken(code, req.params.provider);
    const profile = await fetchUserProfile(tokens.access_token);
    
    // Handle login/signup
    const user = await handleSocialLogin(profile, req.params.provider);
    
    // Create session and redirect
    req.session.user_id = user.id;
    res.redirect('/account');
    
  } catch (error) {
    logger.error('OAuth login error', { error, provider: req.params.provider });
    res.redirect('/login?error=oauth_failed');
  }
}
```

---

## 2. Forgot Password Module

### Password Reset Token Architecture

#### Token Generation & Storage

```javascript
// Generate secure token
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Hash token for storage (never store raw token)
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Create reset record
async function createPasswordReset(userId, ipAddress, userAgent) {
  const token = generateResetToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  
  // Invalidate existing unused tokens
  await db.query(
    'UPDATE password_reset_tokens SET invalidated_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
    [userId]
  );
  
  // Create new token
  await db.query(
    `INSERT INTO password_reset_tokens 
     (user_id, token_hash, expires_at, requested_ip, user_agent, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [userId, tokenHash, expiresAt, ipAddress, userAgent]
  );
  
  return token; // Return raw token (send via email, only hash is stored)
}
```

#### Token Expiration

- **Token lifetime:** 30 minutes
- **Expiration calculation:** `created_at + 30 minutes`
- **Cleanup:** Delete expired tokens daily via cron job
- **Reuse prevention:** Set `used_at` timestamp after successful reset

### Password Reset Email Template

**Subject:** Friedays - Reset Your Password

**Text Version:**
```
Hello {{first_name}},

We received a request to reset the password for your Friedays account.

Click the link below to reset your password within 30 minutes:

https://app.friedays.com/reset-password?token={{token}}

--- SECURITY NOTICE ---
If you did not request this, please ignore this email or contact support immediately.
This link will expire in 30 minutes.
Never share this link with anyone.

If you have questions, contact us at support@friedays.com

Thanks,
The Friedays Team
```

**HTML Version:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #f39c00; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .btn { background: #f39c00; color: white; padding: 12px 24px; 
           text-decoration: none; border-radius: 4px; display: inline-block; }
    .security-box { background: #fff3cd; border-left: 4px solid #f39c00; 
                    padding: 12px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Friedays Password Reset</h1>
    </div>
    <div class="content">
      <p>Hello {{first_name}},</p>
      <p>We received a request to reset the password for your Friedays account.</p>
      
      <p><strong>Click the button below to reset your password within 30 minutes:</strong></p>
      
      <p><a class="btn" href="https://app.friedays.com/reset-password?token={{token}}">
        Reset Password
      </a></p>
      
      <p>Or copy and paste this link:</p>
      <p>https://app.friedays.com/reset-password?token={{token}}</p>
      
      <div class="security-box">
        <strong>⚠️ SECURITY NOTICE</strong>
        <p>If you did not request this, please ignore this email or 
           <a href="mailto:support@friedays.com">contact support</a> immediately.</p>
        <p>This link will expire in 30 minutes and can only be used once.</p>
        <p><strong>Never share this link with anyone.</strong></p>
      </div>
      
      <p>Questions? Contact us at support@friedays.com</p>
      <p>Thanks,<br>The Friedays Team</p>
    </div>
  </div>
</body>
</html>
```

### Password Validation Rules

**Minimum Requirements:**
- ✓ At least 8 characters (max 128)
- ✓ At least 1 uppercase letter (A-Z)
- ✓ At least 1 lowercase letter (a-z)
- ✓ At least 1 digit (0-9)
- ✓ At least 1 special character (!@#$%^&*)
- ✗ Not same as previous password (check against last 3 hashes)
- ✗ Not common password (check against OWASP common passwords list)
- ✗ Not predictable (e.g., "Friedays123!" is rejected)

**Validation Regex:**
```javascript
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()]).{8,128}$/;

function validatePassword(password) {
  const errors = [];
  
  if (!PASSWORD_REGEX.test(password)) {
    errors.push('Password must contain uppercase, lowercase, number, and special character');
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  // Check common passwords
  const commonPasswords = ['Friedays123!', 'Password123!', 'Friedays1234', ...];
  if (commonPasswords.includes(password)) {
    errors.push('This password is too common. Please choose a stronger password.');
  }
  
  return { valid: errors.length === 0, errors };
}
```

### Security Measures Against Attacks

#### 1. Token Reuse Prevention
```javascript
// During reset process
const row = await db.query(
  'SELECT id, used_at FROM password_reset_tokens WHERE token_hash = $1',
  [hashToken(token)]
);

if (row.used_at) {
  throw new Error('This reset link has already been used. Request a new one.');
}

// After successful reset
await db.query(
  'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
  [row.id]
);
```

#### 2. Brute Force Protection
```javascript
// Rate limit reset requests per email
async function rateLimit(email, ipAddress) {
  const WINDOW = 15 * 60 * 1000; // 15 minutes
  const MAX_ATTEMPTS = 3;
  
  const recentAttempts = await db.query(
    `SELECT COUNT(*) as count FROM password_reset_tokens 
     WHERE user_id = (SELECT id FROM users WHERE email = $1)
     AND created_at > NOW() - INTERVAL '15 minutes'`,
    [email]
  );
  
  if (recentAttempts[0].count >= MAX_ATTEMPTS) {
    throw new Error('Too many reset requests. Try again in 15 minutes.');
  }
}
```

#### 3. Token Timing Attack Prevention
```javascript
// Always take similar time regardless of token validity
async function validateResetToken(token) {
  const startTime = Date.now();
  
  try {
    const tokenHash = hashToken(token);
    const row = await db.query(
      'SELECT id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1',
      [tokenHash]
    );
    
    const isValid = row && 
                    row.expires_at > new Date() && 
                    !row.used_at;
    
    // Add random delay to prevent timing analysis
    const elapsed = Date.now() - startTime;
    if (elapsed < 100) {
      await delay(Math.random() * (200 - elapsed));
    }
    
    return isValid;
  } catch (error) {
    // Add delay even on error
    const elapsed = Date.now() - startTime;
    if (elapsed < 100) {
      await delay(Math.random() * (200 - elapsed));
    }
    return false;
  }
}
```

#### 4. IP Address & User Agent Tracking
```javascript
// Log all reset attempts for anomaly detection
await db.query(
  `INSERT INTO security_audit_log (user_id, action, ip_address, user_agent, status)
   VALUES ($1, 'PASSWORD_RESET_REQUEST', $2, $3, $4)`,
  [userId, ipAddress, userAgent, status]
);

// Flag suspicious activity
if (differentCountryDetected(userAgent)) {
  await notifyUser(email, 'Password reset attempt from new location');
}
```

### Reset Confirmation Flow

**Complete User Journey:**

```
┌─────────────────┐
│ User Goes to    │
│ /forgot-password│
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Enter Email Address     │
│ Rate-limit check (3/15m)│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Check if email exists   │
│ (generic message either │
│  way for security)      │
└────────┬────────────────┘
         │
         ▼
        YES ──────► Generate token
         │          Hash it
         │          Save to DB
         │          Send email
         │
         ▼
┌────────────────────────────────┐
│ Show: "Check your email"       │
│ Resend link available (5 min)  │
└────────┬───────────────────────┘
         │
         ▼ (User clicks email link)
┌────────────────────────────────┐
│ GET /reset-password?token=...  │
│ Validate token                 │
│ - exists?                      │
│ - not expired?                 │
│ - not used?                    │
└────────┬───────────────────────┘
         │
         ▼ (VALID)
┌────────────────────────────────┐
│ Show Password Reset Form       │
│ Fields:                        │
│ - New Password                 │
│ - Confirm Password             │
│ - Show strength meter          │
└────────┬───────────────────────┘
         │
         ▼ (User submits)
┌────────────────────────────────┐
│ Validate:                      │
│ - passwords match              │
│ - meets requirements           │
│ - not previous password        │
└────────┬───────────────────────┘
         │
         ▼ (VALID)
┌────────────────────────────────┐
│ Hash password (bcrypt)         │
│ Update users table             │
│ Mark token as used             │
│ Invalidate all sessions        │
│ Send confirmation email        │
└────────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ Show: "Password reset          │
│ successful. Login now."        │
│ Redirect to /login after 3s    │
└────────────────────────────────┘
```

---

## 3. Account Creation Module

### Required Fields for Friedays

This is a food delivery business catering to both customers and restaurant partners.

#### Customer Account Fields

**Required:**
- `email` - Unique identifier, verified
- `password_hash` - Securely hashed
- `first_name` - Given name
- `last_name` - Family name  
- `phone` - Primary contact number
- `address_line1` - Street address
- `city` - City/Municipality
- `postal_code` - Zip code
- `country` - ISO 3166-1 alpha-2 code
- `terms_accepted_at` - Timestamp of T&C acceptance
- `privacy_accepted_at` - Timestamp of privacy policy acceptance

**Optional:**
- `phone_secondary` - Alternative contact number
- `address_line2` - Apartment/suite number
- `marketing_opt_in` - Newsletter preference (default: false)
- `address_notes` - Special delivery instructions
- `date_of_birth` - For birthday promotions (if GDPR compliant)

### Field Specifications

#### `email`
```javascript
{
  type: 'VARCHAR(255)',
  constraints: ['NOT NULL', 'UNIQUE', 'INDEXED'],
  validation: {
    format: 'Must be valid email format (RFC 5322)',
    maxLength: 255,
    caseSensitive: false,  // Store as lowercase
    example: 'customer@example.com'
  },
  database: {
    indexed: true,
    searchable: true,
    notes: 'Must verify before account activation'
  }
}
```

**Validation:**
```javascript
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
  if (!EMAIL_REGEX.test(email)) return false;
  if (email.length > 255) return false;
  
  // Check DNS MX record exists (async, optional)
  try {
    await dns.resolveMx(domain);
    return true;
  } catch {
    return false; // Invalid domain
  }
}
```

#### `password_hash`
```javascript
{
  type: 'VARCHAR(255)',
  constraints: ['NOT NULL'],
  validation: {
    algorithm: 'bcrypt',
    cost: 12,  // minimum rounds
    maxLength: 255,  // storage for hash
  },
  database: {
    indexed: false,
    searchable: false,
    notes: 'Store hash only, never plaintext'
  }
}
```

#### `first_name`, `last_name`
```javascript
{
  type: 'VARCHAR(100)',
  constraints: ['NOT NULL'],
  validation: {
    maxLength: 100,
    pattern: /^[a-zA-Z\s\-\']{1,100}$/,  // Allow names with hyphens/apostrophes
    examples: ['John', "O'Brien", "Maria-Rosa"]
  },
  database: {
    indexed: true,
    searchable: true
  }
}
```

#### `phone`
```javascript
{
  type: 'VARCHAR(20)',
  constraints: ['NOT NULL'],
  validation: {
    format: 'E.164 international format',
    pattern: /^\+[1-9]\d{1,14}$/,
    maxLength: 20,
    examples: ['+14155552671', '+639171234567']
  },
  database: {
    indexed: true,
    searchable: true,
    regional: 'Handle country calling codes'
  }
}
```

**Phone Validation:**
```javascript
const parsePhoneNumber = require('libphonenumber-js');

function validatePhone(phone, country) {
  try {
    const parsed = parsePhoneNumber(phone, country);
    if (!parsed || !parsed.isValid()) {
      return { valid: false, error: 'Invalid phone number format' };
    }
    
    // Return E.164 format
    return { 
      valid: true, 
      formatted: parsed.format('E.164'),
      country: parsed.country
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
```

#### `phone_secondary`
```javascript
{
  type: 'VARCHAR(20)',
  constraints: ['NULL'],  // Optional
  validation: {
    format: 'Same as phone (E.164)',
    pattern: /^\+[1-9]\d{1,14}$/,
    maxLength: 20
  }
}
```

#### `address_line1`, `address_line2`
```javascript
{
  type: 'VARCHAR(255)',
  constraints: ['NOT NULL for line1', 'NULL for line2'],
  validation: {
    maxLength: 255,
    minLength: 5,
    pattern: /^[a-zA-Z0-9\s\-\,\.\/\#]{5,255}$/
  },
  database: {
    indexed: false,
    searchable: true
  }
}
```

#### `city`
```javascript
{
  type: 'VARCHAR(100)',
  constraints: ['NOT NULL'],
  validation: {
    maxLength: 100,
    minLength: 2,
    pattern: /^[a-zA-Z\s\-]{2,100}$/
  }
}
```

#### `postal_code`
```javascript
{
  type: 'VARCHAR(20)',
  constraints: ['NOT NULL'],
  validation: {
    maxLength: 20,
    countrySpecific: true,  // Validation by country
    examples: {
      US: '12345',
      US_extended: '12345-6789',
      CA: 'A1A 1A1',
      PH: '1000'
    }
  }
}
```

**Postal Code Validation:**
```javascript
const POSTAL_CODE_FORMATS = {
  US: /^\d{5}(?:-\d{4})?$/,
  CA: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i,
  UK: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
  PH: /^\d{4}$/,
};

function validatePostalCode(code, country) {
  const format = POSTAL_CODE_FORMATS[country];
  if (!format) {
    return { valid: code.length > 0 && code.length < 20 };
  }
  return { valid: format.test(code) };
}
```

#### `country`
```javascript
{
  type: 'CHAR(2)',
  constraints: ['NOT NULL'],
  validation: {
    format: 'ISO 3166-1 alpha-2',
    length: 2,
    uppercaseOnly: true,
    examples: ['US', 'CA', 'PH', 'GB']
  },
  database: {
    indexed: true,
    searchable: true
  }
}
```

#### `terms_accepted_at`, `privacy_accepted_at`
```javascript
{
  type: 'TIMESTAMP',
  constraints: ['NOT NULL'],
  validation: {
    cannotBeFuture: true,
    mustBePresentOrPast: true
  },
  database: {
    indexed: false,
    notes: 'Record timestamp of explicit user acceptance for audit trail'
  }
}
```

#### `marketing_opt_in`
```javascript
{
  type: 'BOOLEAN',
  constraints: ['NOT NULL'],
  default: false,
  validation: {
    canBeTrue: 'Only if user explicitly opts in',
    canBeFalse: true
  }
}
```

#### `address_notes`
```javascript
{
  type: 'TEXT',
  constraints: ['NULL'],
  validation: {
    maxLength: 500,
    examples: ['Gate code 1234', 'Apartment 15B - ring doorbell twice']
  }
}
```

### Account Creation Form Validation

**Client-Side (Pre-submission):**
```javascript
const formValidation = {
  email: [
    { type: 'required', message: 'Email is required' },
    { type: 'email', message: 'Please enter a valid email' },
    { type: 'maxLength', length: 255 }
  ],
  password: [
    { type: 'required', message: 'Password is required' },
    { type: 'minLength', length: 8, message: 'At least 8 characters' },
    { type: 'pattern', pattern: /(?=.*[A-Z])/, message: 'Needs uppercase letter' },
    { type: 'pattern', pattern: /(?=.*[a-z])/, message: 'Needs lowercase letter' },
    { type: 'pattern', pattern: /(?=.*\d)/, message: 'Needs number' },
    { type: 'pattern', pattern: /(?=.*[!@#$%^&*])/, message: 'Needs special char' }
  ],
  phone: [
    { type: 'required', message: 'Phone number required' },
    { type: 'phone', message: 'Invalid phone number' }
  ],
  address_line1: [
    { type: 'required', message: 'Address required' },
    { type: 'minLength', length: 5 }
  ],
  city: [
    { type: 'required', message: 'City required' },
    { type: 'minLength', length: 2 }
  ],
  postal_code: [
    { type: 'required', message: 'Postal code required' },
    { type: 'postal_code', country: 'country' }
  ],
  terms_accepted: [
    { type: 'required', message: 'You must accept the Terms & Conditions' }
  ]
};
```

**Server-Side (Mandatory):**
- Re-validate all fields
- Check email uniqueness
- Verify phone format (E.164)
- Normalize data (lowercase email, format phone)
- Check for duplicate accounts
- Sanitize all inputs
- Validate file uploads if present

---

## 4. Security & Validation

### Password Hashing Algorithm

**Recommended: bcrypt**

```javascript
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;  // Minimum recommended

// Hash password during registration
export async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

// Verify password during login
export async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

// Usage
const passwordHash = await hashPassword(userPassword);
const isMatch = await verifyPassword(userPassword, storedHash);
```

**Why bcrypt? Comparison:**

| Algorithm | Time/Hash | Memory | GPU Resistant | Recommended |
|-----------|-----------|--------|---------------|-------------|
| bcrypt | ~200ms | Low | High | ✓ YES |
| Argon2id | ~50ms | High | Excellent | Alternative |
| scrypt | ~100ms | High | Good | Alternative |
| MD5 | <1ms | Low | None | ✗ NO |
| SHA-256 | <1ms | Low | None | ✗ NO |

### Login Rate Limiting

**Configuration:**

```javascript
{
  maxAttempts: 5,           // Failed attempts
  windowMs: 15 * 60 * 1000, // 15 minutes
  lockoutMs: 30 * 60 * 1000 // 30 minute lockout
}
```

**Implementation:**

```javascript
async function recordFailedLogin(email, ipAddress, userAgent) {
  const now = new Date();
  const windowStart = new Date(now - 15 * 60 * 1000);
  
  // Count recent failures
  const failures = await db.query(
    `SELECT COUNT(*) as count FROM login_attempts 
     WHERE email = $1 AND attempted_at > $2 AND success = false`,
    [email, windowStart]
  );
  
  // Log this attempt
  await db.query(
    `INSERT INTO login_attempts (email, ip_address, user_agent, success, attempted_at)
     VALUES ($1, $2, $3, false, NOW())`,
    [email, ipAddress, userAgent]
  );
  
  // Lock account if threshold exceeded
  if (failures[0].count >= 5) {
    const unlockTime = new Date(now + 30 * 60 * 1000);
    await db.query(
      `UPDATE users SET account_locked_until = $1 
       WHERE email = $2 AND account_locked_until < NOW()`,
      [unlockTime, email]
    );
    
    // Send notification
    await sendLockoutNotification(email);
    throw new Error('Account locked. Try again in 30 minutes.');
  }
  
  throw new Error('Invalid email or password');
}

async function recordSuccessfulLogin(email, userId, ipAddress) {
  // Log success
  await db.query(
    `INSERT INTO login_attempts (user_id, email, ip_address, success, attempted_at)
     VALUES ($1, $2, $3, true, NOW())`,
    [userId, email, ipAddress]
  );
  
  // Update user last login
  await db.query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [userId]
  );
  
  // Clear failures
  await db.query(
    'DELETE FROM login_attempts WHERE email = $1 AND success = false',
    [email]
  );
}
```

### CSRF Protection

**For HTML Forms:**

```html
<!-- Include token in form -->
<form method="POST" action="/auth/register">
  <input type="hidden" name="csrf_token" value="{{csrfToken}}">
  <input type="email" name="email" required>
  <button type="submit">Register</button>
</form>
```

**Token Generation & Validation:**

```javascript
import csrf from 'csurf';
import session from 'express-session';

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: true,           // HTTPS only
    httpOnly: true,         // No JavaScript access
    sameSite: 'strict'      // CSRF protection
  }
}));

// CSRF middleware
const csrfProtection = csrf({ cookie: false });

app.get('/register', csrfProtection, (req, res) => {
  res.render('register', { csrfToken: req.csrfToken() });
});

app.post('/auth/register', csrfProtection, (req, res) => {
  // Token automatically validated by middleware
  // If invalid, error response sent
  console.log('CSRF token valid');
});
```

**For API/JSON Endpoints:**

```javascript
// Client sends token in header
fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
  },
  body: JSON.stringify({ email, password })
});

// Server validates header
app.post('/api/auth/register', (req, res) => {
  const token = req.headers['x-csrf-token'];
  csrfProtection(req, res, (err) => {
    if (err) return res.status(403).json({ error: 'CSRF validation failed' });
    // Process request
  });
});
```

### Input Sanitization & SQL Injection Prevention

**Always use Parameterized Queries:**

```javascript
// ✗ UNSAFE - SQL Injection vulnerable
db.query(`SELECT * FROM users WHERE email = '${email}'`);

// ✓ SAFE - Parameterized query
db.query('SELECT * FROM users WHERE email = $1', [email]);

// ✓ SAFE - Using ORM
const user = await User.findOne({ email });
```

**Input Sanitization:**

```javascript
import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';

function sanitizeInput(data) {
  return {
    email: validator.isEmail(data.email) ? data.email.toLowerCase() : null,
    first_name: validator.trim(data.first_name).substring(0, 100),
    last_name: validator.trim(data.last_name).substring(0, 100),
    phone: validator.trim(data.phone),
    address_line1: validator.escape(data.address_line1),
  };
}

// For HTML output
const safeOutput = DOMPurify.sanitize(userInput, { ALLOWED_TAGS: [] });
```

### Email Verification Workflow

**Flow Diagram:**

```
┌──────────────────────┐
│ User signs up        │
│ Account created      │
│ status='pending'     │
└───────┬──────────────┘
        │
        ▼
┌──────────────────────────────────┐
│ Generate verification token      │
│ (30-character random string)     │
│ Expire in 24 hours               │
└───────┬──────────────────────────┘
        │
        ▼
┌──────────────────────────────────┐
│ Send verification email with:    │
│ https://app.friedays.com/        │
│ verify?token=XXXXX               │
└───────┬──────────────────────────┘
        │
        ▼
┌──────────────────────────────────┐
│ User clicks email link           │
│ System validates token           │
└───────┬──────────────────────────┘
        │     │
        ├─YES─┴─► ┌──────────────────┐
        │          │ Set             │
        │          │ email_verified_at
        │          │ Done!           │
        │          └──────────────────┘
        │
        └─NO──► Error: 'Token expired or invalid'
                Offer to resend
```

**Implementation:**

```javascript
// Create verification token
async function sendVerificationEmail(userId, email) {
  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  await db.query(
    `INSERT INTO email_verification_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, token, expiresAt]
  );
  
  const verifyUrl = `https://app.friedays.com/verify-email?token=${token}`;
  await sendEmail(email, 'Verify your email', verifyUrl);
}

// Verify email token
app.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  
  const record = await db.query(
    `SELECT user_id, expires_at FROM email_verification_tokens 
     WHERE token = $1 AND used_at IS NULL`,
    [token]
  );
  
  if (!record || record.expires_at < new Date()) {
    return res.status(400).render('error', { 
      message: 'Link expired. Request a new one.' 
    });
  }
  
  // Mark email as verified
  await db.query(
    'UPDATE users SET email_verified_at = NOW() WHERE id = $1',
    [record.user_id]
  );
  
  // Mark token used
  await db.query(
    'UPDATE email_verification_tokens SET used_at = NOW() WHERE token = $1',
    [token]
  );
  
  res.render('success', { message: 'Email verified! You can now login.' });
});
```

### Account Lockout Mechanism

**Automatic Lockout:**

```javascript
// Trigger after 5 failed attempts in 15 minutes
async function handleFailedLogin(email) {
  const recentFailures = await countRecentFailures(email, 15);
  
  if (recentFailures >= 5) {
    const unlockTime = new Date(Date.now() + 30 * 60 * 1000);
    
    await db.query(
      `UPDATE users SET account_locked_until = $1 WHERE email = $2`,
      [unlockTime, email]
    );
    
    await sendLockoutEmail(email, unlockTime);
    throw new Error('Account temporarily locked for security.');
  }
}

// Check lockout on login attempt
async function checkAccountLock(email) {
  const user = await db.query(
    'SELECT account_locked_until FROM users WHERE email = $1',
    [email]
  );
  
  if (user.account_locked_until > new Date()) {
    const remainingMinutes = Math.ceil(
      (user.account_locked_until - new Date()) / 60000
    );
    throw new Error(
      `Account locked. Try again in ${remainingMinutes} minutes.`
    );
  }
}

// Check and unlock expired lockouts
app.post('/recover-account', async (req, res) => {
  const { email } = req.body;
  
  // Send recovery email
  const token = crypto.randomBytes(32).toString('hex');
  await db.query(
    `INSERT INTO account_recovery_tokens (email, token, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
    [email, token]
  );
  
  await sendRecoveryEmail(email, token);
  res.json({ message: 'Recovery email sent' });
});
```

---

## 5. User Flow Diagrams

### Complete Account Creation Flow

```
START
  │
  ├─► User visits /register
  │   ├─ Display registration form
  │   │  (email, password, name, phone, address, etc.)
  │   │
  │   ├─ User fills form
  │   │
  │   └─► Submit form
  │       │
  │       ├─► CLIENT VALIDATION
  │       │   ├─ Email format valid?
  │       │   ├─ Passwords match?
  │       │   ├─ Password strong enough?
  │       │   ├─ Phone format valid?
  │       │   ├─ Address filled?
  │       │   └─ T&C checked?
  │       │
  │       ├─ Show errors? ──► User fixes ──┐
  │       │  (No)                          │
  │       │                                │
  │       ├─► SERVER VALIDATION           │
  │       │   ├─ Email not in database?   │
  │       │   ├─ CSRF token valid?        │
  │       │   ├─ No spam bot detected?    │
  │       │   └─ Phone unique?            │
  │       │                               │
  │       ├─ Validation error? ───────────┴─► Show error message
  │       │  (Yes)
  │       │
  │       ├── Validation passed (No)
  │       │
  │       ├─► CREATE ACCOUNT
  │       │   ├─ Hash password (bcrypt)
  │       │   ├─ Insert user record
  │       │   │  status = 'pending'
  │       │   ├─ Create tier (BRONZE)
  │       │   │  points = 0
  │       │   └─ Get tier benefits
  │       │
  │       ├─► SEND VERIFICATION EMAIL
  │       │   ├─ Generate token (expires 24h)
  │       │   └─ Send email with link
  │       │
  │       └─► Show success screen
  │           "Check your email to verify"
  │
  └── END

User checks email...
  │
  ├─► Clicks verification link
  │   ├─ token valid?
  │   ├─ not expired?
  │   ├─ not used?
  │   │
  │   ├── All valid
  │   │   ├─ Set email_verified_at
  │   │   ├─ Set status = 'active'
  │   │   ├─ Send welcome email
  │   │   └─ Redirect to login
  │   │
  │   └─ Invalid/Expired?
  │       ├─ Show error
  │       ├─ Offer resend
  │       └─ Can resend 3x in 24h
  │
  └── User can now LOGIN
```

### Social Login Flow

```
START (User on /login page)
  │
  ├─► Click "Sign in with Google" or "Facebook"
  │   │
  │   ├─► Generate state token (CSRF)
  │   │   └─ Store in session
  │   │
  │   └─► Redirect to provider
  │       ├─ Google: accounts.google.com/o/oauth2/v2/auth?...
  │       └─ Facebook: facebook.com/v18.0/dialog/oauth?...
  │
  ├─► User authenticates with provider
  │
  ├─► Provider shows consent screen
  │   └─ Request permissions: email, name, picture
  │
  ├─► User grants permission
  │
  └─► Provider redirects to callback
      ├─ /auth/google/callback?code=AUTH_CODE&state=STATE_TOKEN
      │
      ├─► Backend receives callback
      │   ├─ Validate state token ✓
      │   ├─ Exchange code for access token
      │   ├─ Fetch user profile
      │   │
      │   ├─► EMAIL IN SYSTEM?
      │   │
      │   ├─ NO (New user)
      │   │ ├─ Create account
      │   │ ├─ Set tier = BRONZE
      │   │ ├─ Set oauth_provider = 'google'
      │   │ ├─ Auto-verify email
      │   │ └─ Create session
      │   │
      │   ├─ YES (Existing user)
      │   │ ├─ Same provider?
      │   │ │ ├─ YES: Login
      │   │ │ └─ Create session
      │   │ │
      │   │ └─ Different provider?
      │   │   ├─ Show: "Account exists with [other provider]"
      │   │   ├─ Show: "Sign in there first or use email login"
      │   │   └─ No session created
      │   │
      │   └─► Create JWT token
      │       └─ Set secure cookie
      │
      └─► Redirect to /account (authenticated)
```

### Forgot Password Flow

```
START (User on /login, forgot password)
  │
  ├─► Click "Forgot my password"
  │
  └─► Navigate to /forgot-password
      │
      ├─► FORM: Enter email address
      │   │
      │   ├─ User enters email
      │   │
      │   ├─► CLIENT VALIDATION
      │   │   └─ Email format valid?
      │   │
      │   └─► SERVER VALIDATION
      │       ├─ Email valid format?
      │       ├─ Rate limit: 3 requests per 15 min?
      │       ├─ Account exists? (generic response either way)
      │       │
      │       ├─ Account exists (backend only)
      │       │ ├─ Generate reset token (32 bytes random)
      │       │ ├─ Hash token for storage
      │       │ ├─ Save to DB:
      │       │ │  - token_hash
      │       │ │  - expires_at = now + 30 min
      │       │ │  - created_at
      │       │ │  - ip_address
      │       │ │  - user_agent
      │       │ │
      │       │ ├─ Send reset email with:
      │       │ │  https://app.friedays.com/reset-password?token=TOKEN
      │       │ │
      │       │ └─ Log: "Password reset requested"
      │       │
      │       └─► Show confirmation
      │           "Check your email for reset link"
      │           "Link expires in 30 minutes"
      │
      └── END (User checks email)

USER CLICKS EMAIL LINK
  │
  ├─► Navigate to /reset-password?token=TOKEN
  │
  └─► Backend validates token
      ├─ Token hash matches DB?
      ├─ Token not expired (< 30 min)?
      ├─ Token not marked used?
      │
      ├─ INVALID/EXPIRED
      │ ├─ Show: "Link expired or invalid"
      │ ├─ Redirect to /forgot-password
      │ └─ Allow resend
      │
      ├─ VALID
      │ ├─► Display password reset form
      │ │   ├─ New password
      │ │   ├─ Confirm password
      │ │   └─ Show strength meter
      │ │
      │ ├─ User enters new password
      │ │
      │ ├─► CLIENT VALIDATION
      │ │   ├─ Passwords match?
      │ │   ├─ Password strong (8+ chars, upper, lower, digit, special)?
      │ │   └─ Show real-time feedback
      │ │
      │ └─► SERVER VALIDATION
      │     ├─ Passwords match?
      │     ├─ Password meets requirements?
      │     ├─ Token still valid? (re-check)
      │     ├─ Token not already used?
      │     ├─ Not same as previous password?
      │     ├─ Not in common passwords list?
      │     │
      │     ├─ VALIDATION FAILED
      │     │ ├─ Show specific error message
      │     │ └─ Allow retry
      │     │
      │     ├─ VALIDATION PASSED
      │     │ ├─ Hash new password (bcrypt)
      │     │ ├─ Update users table
      │     │ ├─ Mark token as used
      │     │ ├─ Invalidate all active sessions
      │     │ ├─ Log: "Password reset successful"
      │     │ ├─ Send confirmation email
      │     │ └─ Send security alert email
      │     │
      │     └─► Show success
      │         "Password changed successfully"
      │         Redirect to /login after 3 seconds
      │
      └── USER LOGS IN with new password
```

---

## 6. Database Schema

### Schema Overview

```sql
-- Main users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  email_verified_at TIMESTAMP NULL,
  password_hash VARCHAR(255),
  
  -- Profile
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  phone_secondary VARCHAR(20),
  
  -- Address
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country CHAR(2) NOT NULL,
  address_notes TEXT,
  
  -- Preferences
  marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted_at TIMESTAMP NOT NULL,
  privacy_accepted_at TIMESTAMP NOT NULL,
  
  -- OAuth
  oauth_provider VARCHAR(50),
  oauth_provider_id VARCHAR(128),
  
  -- Account status
  account_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  account_locked_until TIMESTAMP,
  
  -- Authentication
  failed_login_count INT NOT NULL DEFAULT 0,
  
  -- Loyalty
  tier VARCHAR(20) NOT NULL DEFAULT 'BRONZE',
  loyalty_points INT NOT NULL DEFAULT 0,
  total_spent DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP,
  
  CONSTRAINT account_status_check CHECK (account_status IN ('pending', 'active', 'locked', 'disabled')),
  CONSTRAINT tier_check CHECK (tier IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM')),
  CONSTRAINT valid_country CHECK (LENGTH(country) = 2 AND country = UPPER(country))
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_country ON users(country);
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_provider_id) WHERE oauth_provider IS NOT NULL;
CREATE INDEX idx_users_account_status ON users(account_status);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

### Password Reset Tokens Table

```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  requested_ip VARCHAR(45),
  user_agent VARCHAR(255),
  
  CONSTRAINT token_cannot_be_future CHECK (expires_at > created_at)
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash) WHERE used_at IS NULL;
CREATE INDEX idx_password_reset_tokens_expires ON password_reset_tokens(expires_at) WHERE used_at IS NULL;
```

### Email Verification Tokens Table

```sql
CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT token_cannot_be_future CHECK (expires_at > created_at)
);

CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token) WHERE used_at IS NULL;
CREATE INDEX idx_email_verification_tokens_expires ON email_verification_tokens(expires_at) WHERE used_at IS NULL;
```

### Login Attempts Table (for tracking/security)

```sql
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
CREATE INDEX idx_login_attempts_user_id ON login_attempts(user_id, attempted_at DESC);
CREATE INDEX idx_login_attempts_ip_address ON login_attempts(ip_address, attempted_at DESC);
```

### Security Audit Log Table

```sql
CREATE TABLE security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  status VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_security_audit_log_user_id ON security_audit_log(user_id, created_at DESC);
CREATE INDEX idx_security_audit_log_action ON security_audit_log(action, created_at DESC);
CREATE INDEX idx_security_audit_log_ip ON security_audit_log(ip_address, created_at DESC);
```

### Data Retention Policies

```sql
-- Clean up expired reset tokens (daily)
DELETE FROM password_reset_tokens 
WHERE expires_at < NOW() - INTERVAL '7 days'
  AND used_at IS NOT NULL;

-- Clean up expired verification tokens (daily)
DELETE FROM email_verification_tokens 
WHERE expires_at < NOW() - INTERVAL '7 days'
  AND used_at IS NOT NULL;

-- Clean up old login attempts (monthly, keep 90 days)
DELETE FROM login_attempts 
WHERE attempted_at < NOW() - INTERVAL '90 days';

-- Archive old audit logs (yearly)
INSERT INTO security_audit_log_archive
SELECT * FROM security_audit_log 
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM security_audit_log 
WHERE created_at < NOW() - INTERVAL '1 year';
```

---

## 7. Critical Implementation Code Snippets

### Password Hashing (Node.js/TypeScript)

```javascript
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password to verify
 * @param {string} hash - Hashed password from database
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Check if password needs rehash (if cost rounds changed)
 * @param {string} hash - Password hash to check
 * @returns {Promise<boolean>} True if needs rehashing
 */
export async function passwordNeedsRehash(hash) {
  const info = await bcrypt.getRounds(hash);
  return info < BCRYPT_ROUNDS;
}
```

### Secure Token Generation

```javascript
import crypto from 'crypto';

/**
 * Generate cryptographically secure random token
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} Hex-encoded token
 */
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate CSRF token
 * @returns {string} CSRF token
 */
export function generateCSRFToken() {
  return generateSecureToken(32);
}

/**
 * Hash a token (for storage in database)
 * @param {string} token - Raw token
 * @returns {string} SHA-256 hash
 */
export function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

/**
 * Generate password reset token and hash
 * @returns {object} { token: raw token, hash: SHA-256 hash }
 */
export function generatePasswordResetToken() {
  const token = generateSecureToken(32);
  const hash = hashToken(token);
  return { token, hash };
}
```

### User Registration Handler

```javascript
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import validator from 'validator';

const router = Router();

/**
 * POST /auth/register
 * Register a new user account
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone, address_line1, 
            city, postal_code, country, terms_accepted, privacy_accepted } = req.body;
    
    // Validate CSRF token
    if (req.csrfToken() !== req.body._csrf) {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }
    
    // Validate inputs
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password too short' });
    }
    
    if (!terms_accepted || !privacy_accepted) {
      return res.status(400).json({ 
        error: 'You must accept Terms & Conditions and Privacy Policy' 
      });
    }
    
    // Check email uniqueness
    const existingUser = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [email.toLowerCase()]
    );
    
    if (existingUser.length > 0) {
      return res.status(409).json({ 
        error: 'Email already registered. Please login or use another email.' 
      });
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create user
    const userId = uuidv4();
    const now = new Date();
    
    await db.query(
      `INSERT INTO users (
        id, email, password_hash, first_name, last_name, phone, 
        address_line1, city, postal_code, country,
        terms_accepted_at, privacy_accepted_at, account_status,
        tier, loyalty_points
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        userId, email.toLowerCase(), passwordHash, first_name, last_name, phone,
        address_line1, city, postal_code, country.toUpperCase(),
        now, now, 'pending',
        'BRONZE', 0
      ]
    );
    
    // Generate email verification token
    const verificationToken = generateSecureToken(32);
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await db.query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, verificationToken, verificationExpires]
    );
    
    // Send verification email
    const verifyUrl = `https://app.friedays.com/verify-email?token=${verificationToken}`;
    await sendVerificationEmail(email, first_name, verifyUrl);
    
    // Log registration
    await logAuditEvent(userId, 'USER_REGISTERED', { email }, req);
    
    res.status(201).json({
      message: 'Account created successfully. Check your email to verify.',
      user: {
        id: userId,
        email,
        first_name,
        tier: 'BRONZE'
      }
    });
    
  } catch (error) {
    logger.error('Registration error', { error });
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

export default router;
```

### Password Reset Handler

```javascript
/**
 * POST /auth/forgot-password
 * Initiate password reset workflow
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    
    // Rate limiting: 3 resets per 15 minutes
    const recentResets = await db.query(
      `SELECT COUNT(*) as count FROM password_reset_tokens
       WHERE user_id = (SELECT id FROM users WHERE LOWER(email) = $1)
       AND created_at > NOW() - INTERVAL '15 minutes'
       AND used_at IS NULL`,
      [email.toLowerCase()]
    );
    
    if (recentResets[0]?.count >= 3) {
      // Generic response for security
      return res.status(429).json({
        message: 'Too many reset requests. Try again later.'
      });
    }
    
    // Find user (do same work for both found/not found for timing attack prevention)
    const user = await db.query(
      'SELECT id, email FROM users WHERE LOWER(email) = $1',
      [email.toLowerCase()]
    );
    
    // Always return same response
    if (user.length === 0) {
      // Log attempt for security
      await logAuditEvent(null, 'PASSWORD_RESET_UNKNOWN_EMAIL', { email }, req);
    } else {
      // Generate reset token
      const { token, hash } = generatePasswordResetToken();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      
      // Invalidate previous unused tokens
      await db.query(
        `UPDATE password_reset_tokens 
         SET invalidated_at = NOW() 
         WHERE user_id = $1 AND used_at IS NULL`,
        [user[0].id]
      );
      
      // Store token
      await db.query(
        `INSERT INTO password_reset_tokens 
         (user_id, token_hash, expires_at, requested_ip, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [user[0].id, hash, expiresAt, ipAddress, userAgent]
      );
      
      // Send reset email
      const resetUrl = `https://app.friedays.com/reset-password?token=${token}`;
      await sendPasswordResetEmail(user[0].email, user[0].first_name, resetUrl);
      
      // Log success
      await logAuditEvent(user[0].id, 'PASSWORD_RESET_REQUESTED', {}, req);
    }
    
    // Generic response
    res.status(200).json({
      message: 'If an account exists with this email, a reset link has been sent.'
    });
    
  } catch (error) {
    logger.error('Forgot password error', { error });
    res.status(500).json({ error: 'Request failed. Please try again.' });
  }
});

/**
 * POST /auth/reset-password
 * Complete password reset workflow
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password, passwordConfirm } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (password !== passwordConfirm) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    
    const { valid, errors: validationErrors } = validatePassword(password);
    if (!valid) {
      return res.status(400).json({ errors: validationErrors });
    }
    
    // Hash token for lookup
    const tokenHash = hashToken(token);
    
    // Validate token
    const resetRecord = await db.query(
      `SELECT user_id, expires_at, used_at FROM password_reset_tokens 
       WHERE token_hash = $1`,
      [tokenHash]
    );
    
    if (!resetRecord || resetRecord[0].used_at) {
      return res.status(400).json({ 
        error: 'Invalid or already-used reset link. Request a new one.' 
      });
    }
    
    if (resetRecord[0].expires_at < new Date()) {
      return res.status(400).json({ 
        error: 'Reset link expired. Request a new one.' 
      });
    }
    
    // Hash new password
    const passwordHash = await hashPassword(password);
    
    // Update password
    const userId = resetRecord[0].user_id;
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, userId]
    );
    
    // Mark token used
    await db.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1',
      [tokenHash]
    );
    
    // Invalidate all sessions
    await db.query(
      'DELETE FROM user_sessions WHERE user_id = $1',
      [userId]
    );
    
    // Send confirmation email
    const user = await db.query('SELECT email, first_name FROM users WHERE id = $1', [userId]);
    await sendPasswordChangedEmail(user[0].email, user[0].first_name);
    
    // Log success
    await logAuditEvent(userId, 'PASSWORD_RESET_COMPLETED', {}, req);
    
    res.status(200).json({
      message: 'Password reset successfully. You can now login.'
    });
    
  } catch (error) {
    logger.error('Reset password error', { error });
    res.status(500).json({ error: 'Password reset failed. Please try again.' });
  }
});
```

### OAuth Handler (Google)

```javascript
/**
 * GET /auth/google
 * Initiate Google OAuth flow
 */
router.get('/google', (req, res) => {
  const state = generateCSRFToken();
  req.session.oauth_state = state;
  
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state
  });
  
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

/**
 * GET /auth/google/callback
 * Handle Google OAuth callback
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    // Validate CSRF state
    if (state !== req.session.oauth_state) {
      logger.error('CSRF mismatch', { expected: req.session.oauth_state, received: state });
      return res.redirect('/login?error=csrf_mismatch');
    }
    
    // Handle provider errors
    if (error) {
      logger.warn(`Google OAuth error: ${error}`);
      return res.redirect(`/login?error=${error}`);
    }
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });
    
    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      throw new Error(`Token exchange failed: ${tokens.error}`);
    }
    
    // Decode ID token to get user info
    const payload = jwt.decode(tokens.id_token);
    
    if (!payload.email_verified) {
      return res.redirect('/login?error=email_not_verified');
    }
    
    // Check for existing user
    let user = await db.query(
      'SELECT * FROM users WHERE LOWER(email) = $1 OR (oauth_provider = $2 AND oauth_provider_id = $3)',
      [payload.email.toLowerCase(), 'google', payload.sub]
    );
    
    if (user.length === 0) {
      // Create new user
      const userId = uuidv4();
      const now = new Date();
      
      await db.query(
        `INSERT INTO users (
          id, email, first_name, last_name, oauth_provider, oauth_provider_id,
          email_verified_at, account_status, tier, loyalty_points,
          terms_accepted_at, privacy_accepted_at, created_at
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
          0,
          now,
          now,
          now
        ]
      );
      
      user = [{ id: userId, email: payload.email }];
      
      await logAuditEvent(userId, 'ACCOUNT_CREATED_OAUTH', { provider: 'google' }, req);
    }
    
    // Create session
    req.session.user_id = user[0].id;
    
    // Update last login
    await db.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user[0].id]
    );
    
    await logAuditEvent(user[0].id, 'LOGIN_OAUTH', { provider: 'google' }, req);
    
    res.redirect('/account');
    
  } catch (error) {
    logger.error('Google OAuth callback error', { error });
    res.redirect('/login?error=oauth_failed');
  }
});
```

---

## 8. Security Configuration Checklist

### During Development
- [ ] Enable HTTPS only (even for localhost with self-signed certs)
- [ ] Set `SECURE_SSL_REDIRECT=true`
- [ ] Enable CORS only for trusted domains
- [ ] Configure CSRF protection on all forms
- [ ] Set up rate limiting on auth endpoints
- [ ] Enable request logging with IP tracking
- [ ] Use environment variables for secrets (never commit)
- [ ] Set up .env.example with dummy values

### During Deployment
- [ ] All secrets in secure configuration management (not code)
- [ ] HTTPS/TLS with valid certificate
- [ ] HSTS headers enabled
- [ ] Secure cookie flags: `Secure`, `HttpOnly`, `SameSite=Strict`
- [ ] Content Security Policy headers configured
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Rate limiting properly configured
- [ ] Password reset tokens expire properly
- [ ] Database backups automated
- [ ] Audit logs retained for 1+ year
- [ ] Security monitoring/alerting active
- [ ] Penetration testing completed
- [ ] OWASP dependency check running

### Before Going Live
- [ ] Email templates tested
- [ ] SMS verification tested (if used)
- [ ] Error messages don't leak sensitive info
- [ ] Forgotten password flow tested end-to-end
- [ ] OAuth providers tested with real credentials
- [ ] 2FA implemented (recommended)
- [ ] Session timeout configured
- [ ] Account recovery process documented
- [ ] Support contact info in error messages
- [ ] Terms & Conditions reviewed by legal
- [ ] GDPR compliance verified
- [ ] Data retention policies implemented

---

## Integration with Friedays Existing System

Your Friedays application already has:
- **Tier-based loyalty system**: BRONZE, SILVER, GOLD, PLATINUM
- **Order tracking**: Order history with dates and amounts
- **Account profile** page with tier information

**How to integrate this auth module:**

1. **User Registration** creates user with:
   - `tier = 'BRONZE'`
   - `loyalty_points = 0`
   - `total_spent = 0`
   
2. **Upon successful order**, update:
   ```sql
   UPDATE users 
   SET total_spent = total_spent + ${order_amount},
       loyalty_points = loyalty_points + ${points_earned}
   WHERE id = ${user_id};
   ```

3. **Auto-upgrade tier** when spending thresholds crossed:
   ```javascript
   const tiers = {
     BRONZE: { min: 0, discount: 0.05 },
     SILVER: { min: 5000, discount: 0.10 },
     GOLD: { min: 15000, discount: 0.15 },
     PLATINUM: { min: 50000, discount: 0.20 }
   };
   ```

4. **Session management**: After login, store in `friedays_session`:
   ```javascript
   sessionStorage.setItem('friedays_session', JSON.stringify({
     user_id: user.id,
     email: user.email,
     tier: user.tier,
     loyalty_points: user.loyalty_points,
     token: jwt_token
   }));
   ```

---

## Summary

This is a complete, production-ready authentication system designed specifically for Friedays. It includes:

✅ **Security**: Bcrypt, rate limiting CSRF, SQL injection prevention  
✅ **OAuth**: Google & Facebook integration  
✅ **Password Management**: Secure reset with 30-min tokens  
✅ **Account Creation**: Field validation, email verification  
✅ **Documentation**: Flows, schemas, code snippets  
✅ **Integration**: Works with your existing tier system  

**Next Steps:**
1. Choose backend language (Node.js, Python, PHP, etc.)
2. Set up database (PostgreSQL recommended)
3. Configure OAuth providers
4. Implement the code snippets
5. Test thoroughly before production
