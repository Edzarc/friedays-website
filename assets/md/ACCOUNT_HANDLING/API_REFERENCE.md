# Friedays Authentication API - Quick Reference

**Base URL:** `http://localhost:5000` (development)  
**Documentation:** See `backend/SETUP.md` for complete setup guide

---

## Authentication Endpoints

### 1. Register User
**POST** `/auth/register`

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+12125551234",
  "password": "SecurePass123!",
  "password_confirm": "SecurePass123!",
  "address_line1": "123 Main St",
  "address_line2": "Apt 4B",
  "city": "New York",
  "postal_code": "10001",
  "country": "US",
  "marketing_opt_in": true,
  "terms_accepted": true,
  "privacy_accepted": true
}
```

**Response (201 Created):**
```json
{
  "message": "Registration successful. Please verify your email.",
  "user": {
    "id": "user-id-uuid",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "tier": "BRONZE",
    "loyalty_points": 0,
    "email_verified_at": null,
    "created_at": "2026-03-28T10:15:00Z"
  }
}
```

**Errors:**
- `400` - Validation failed (see message)
- `409` - Email already exists
- `500` - Server error

---

### 2. Login
**POST** `/auth/login`

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "remember_me": true
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id-uuid",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "tier": "BRONZE",
    "loyalty_points": 500,
    "total_spent": 45.99,
    "email_verified_at": "2026-03-28T10:20:00Z"
  }
}
```

**Errors:**
- `400` - Missing email or password
- `401` - Invalid credentials
- `429` - Too many attempts (rate limited)
- `423` - Account locked (too many failed logins)

**Rate Limiting:**
- 5 attempts per 15 minutes
- 30-min lockout after threshold

---

### 3. Verify Email
**GET** `/auth/verify-email?token=abc123...`

**Response (200 OK):**
```json
{
  "message": "Email verified successfully",
  "user": {
    "email": "john@example.com",
    "email_verified_at": "2026-03-28T10:30:00Z"
  }
}
```

**Errors:**
- `400` - Missing or invalid token
- `410` - Token expired or already used

---

### 4. Forgot Password
**POST** `/auth/forgot-password`

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "If an account exists with that email, a password reset link has been sent"
}
```

**Note:** Always returns 200 for security (prevents user enumeration)

**Rate Limit:** 3 requests per 15 minutes

---

### 5. Reset Password
**POST** `/auth/reset-password`

**Request:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePass456!",
  "password_confirm": "NewSecurePass456!"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset successful. Please log in with your new password."
}
```

**Errors:**
- `400` - Validation failed
- `410` - Token expired or invalid

**Token Validity:** 30 minutes

---

## User Profile Endpoints

All require `Authorization: Bearer <jwt_token>` header

### 6. Get User Profile
**GET** `/api/users/me`

**Response (200 OK):**
```json
{
  "id": "user-id-uuid",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+12125551234",
  "address_line1": "123 Main St",
  "city": "New York",
  "postal_code": "10001",
  "tier": "SILVER",
  "loyalty_points": 1250,
  "total_spent": 456.78,
  "created_at": "2026-03-28T10:15:00Z",
  "email_verified_at": "2026-03-28T10:30:00Z",
  "last_login_at": "2026-03-29T15:45:00Z"
}
```

---

### 7. Update User Profile
**PUT** `/api/users/me`

**Request:**
```json
{
  "first_name": "John",
  "phone": "+12125551234",
  "address_line1": "456 Oak Ave",
  "city": "New York",
  "postal_code": "10002",
  "marketing_opt_in": false
}
```

**Response (200 OK):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "user-id-uuid",
    "email": "john@example.com",
    "first_name": "John",
    "address_line1": "456 Oak Ave",
    "city": "New York",
    "marketing_opt_in": false
  }
}
```

---

### 8. Get User Orders & Tier Info
**GET** `/api/users/me/orders`

**Response (200 OK):**
```json
{
  "tier": "SILVER",
  "loyalty_points": 1250,
  "total_spent": 456.78,
  "tier_benefits": {
    "discount_percent": 5,
    "free_delivery_above": 25,
    "points_per_dollar": 1
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

### Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `VALIDATION_FAILED` | 400 | Invalid input data |
| `EMAIL_ALREADY_EXISTS` | 409 | Email already registered |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `TOKEN_EXPIRED` | 410 | Reset/verification token expired |
| `TOKEN_INVALID` | 400 | Token format invalid |
| `RATE_LIMITED` | 429 | Too many requests |
| `ACCOUNT_LOCKED` | 423 | Account temporarily locked |
| `UNAUTHORIZED` | 401 | JWT token invalid/missing |
| `NOT_FOUND` | 404 | User/resource not found |

---

## JWT Token

**Format:** Bearer token (store in `localStorage.friedays_token`)

**Payload Includes:**
- `id` - User ID
- `email` - User email
- `tier` - User tier (BRONZE/SILVER/GOLD/PLATINUM)

**Expiry:** 24 hours from login

**Usage:**
```javascript
// Include in all authenticated requests
fetch('/api/users/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## Password Requirements

Passwords must contain **ALL** of:
- ✓ Minimum 8 characters
- ✓ At least 1 uppercase letter (A-Z)
- ✓ At least 1 lowercase letter (a-z)
- ✓ At least 1 number (0-9)
- ✓ At least 1 special character (!@#$%^&*)

**Valid Examples:**
- `MySecurePass123!`
- `Friedays@Pizza456`
- `Order#Food789`

**Invalid Examples:**
- `password123` (no uppercase, special char)
- `PASSWORD123!` (no lowercase)
- `Pass@1` (too short)

---

## Phone Number Format

Must use **E.164 international format**:

```
+[country-code][phone-number]
```

**Examples:**
- US: `+12125551234`
- UK: `+442071838750`
- Canada: `+14165551234`
- Australia: `+61291234567`

---

## Request Headers

All requests should include:

```
Content-Type: application/json
```

Authenticated requests must include:

```
Authorization: Bearer <jwt_token>
```

---

## CORS

Requests from these origins are allowed:
- `http://localhost:3000` (development)
- `http://localhost` (development)
- Your `FRONTEND_URL` in `.env` (production)

Update `CORS_ORIGIN` in `.env` to match your frontend URL.

---

## Rate Limiting

**Login Endpoint:**
- 5 attempts per 15 minutes
- 30-minute account lockout after threshold

**Forgot Password Endpoint:**
- 3 requests per 15 minutes

**Other endpoints:**
- 100 requests per minute per IP

---

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com",
    "phone": "+12125551234",
    "password": "Test@1234",
    "password_confirm": "Test@1234",
    "terms_accepted": true,
    "privacy_accepted": true
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234"
  }'
```

### Get Profile (use token from login response)
```bash
curl http://localhost:5000/api/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Health Check

**GET** `/health`

**Response (200 OK):**
```json
{
  "status": "ok"
}
```

Use this to verify backend is running.

---

## Environment Configuration

See `backend/.env` for these settings:

| Variable | Usage |
|----------|-------|
| `DATABASE_URL` | PostgreSQL connection |
| `JWT_SECRET` | JWT token signing |
| `JWT_EXPIRY` | Token validity (hours) |
| `SMTP_HOST` | Email server |
| `SMTP_USER` | Email account |
| `SMTP_PASS` | Email password |
| `FRONTEND_URL` | CORS origin |
| `API_PORT` | Server port |
| `NODE_ENV` | Mode (development/production) |

---

## Related Files

- **Frontend Forms:** See `register.html`, `forgot-password.html`, `reset-password.html`
- **Frontend Logic:** See `js/auth.js`
- **Backend Routes:** See `backend/routes/auth.js` and `backend/routes/users.js`
- **Database Schema:** See `backend/db/init.js`
- **Setup Guide:** See `backend/SETUP.md`

---

**Last Updated:** March 28, 2026  
**API Version:** 1.0.0  
**Status:** Production Ready
