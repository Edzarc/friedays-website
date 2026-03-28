# Friedays OAuth Setup Guide

This guide walks you through setting up Google and Facebook OAuth authentication for your Friedays application.

---

## 📋 Overview

OAuth allows users to log in using their existing Google or Facebook accounts. The implementation includes:

- ✅ Backend OAuth routes for Google and Facebook
- ✅ Frontend OAuth buttons on login and registration pages
- ✅ Automatic user account creation/linking
- ✅ JWT token generation after OAuth login
- ✅ Email verification bypass (pre-verified via OAuth provider)

---

## 🔧 Phase 1: Google OAuth Setup

### 1.1 Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project:
   - Click "Select a Project" → "New Project"
   - Name: `Friedays OAuth`
   - Click "Create"

3. Enable Google+ API:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click on it and press "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Name: `Friedays Login`
   - Authorized JavaScript origins: Add both
     - `http://localhost:5000`
     - `http://localhost`
   - Authorized redirect URIs: Add
     - `http://localhost:5000/auth/google/callback`
   - Click "Create"

5. Copy the credentials:
   - You'll see "Client ID" and "Client secret"
   - Save these for the next step

### 1.2 Update Backend Environment

Add to `backend/.env` (or create from `.env.example`):

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
```

---

## 🔧 Phase 2: Facebook OAuth Setup

### 2.1 Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. App type: "Consumer"
4. App Details:
   - App Name: `Friedays Login`
   - App Purpose: "Testing" → "Create App"

### 2.2 Add Facebook Login

1. In your app dashboard, click "Add Product"
2. Find "Facebook Login" and click "Set Up"
3. Platform: Select "Web"
4. Go to Facebook Login settings:
   - Settings → Basic → Copy App ID and App Secret

### 2.3 Configure Redirect URLs

In Facebook App dashboard:

1. Go to Settings → Basic (already open)
2. Note the URL (e.g., https://developers.facebook.com/apps/123456)
3. Settings → Basic → scroll down to "App Domains"
   - Add: `localhost`
4. Go to "Facebook Login" → Settings
   - Valid OAuth Redirect URIs: Add
     - `http://localhost:5000/auth/facebook/callback`
   - Save changes

### 2.4 Update Backend Environment

Add to `backend/.env`:

```env
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
FACEBOOK_REDIRECT_URI=http://localhost:5000/auth/facebook/callback
```

---

## 🚀 Phase 3: Test OAuth Flow

### 3.1 Install New Dependencies

```bash
cd backend
npm install
# This installs cookie-parser if not already installed
```

### 3.2 Restart Backend

```bash
cd backend
npm run dev
```

Expected output should show OAuth routes:
```
✓ GET  /auth/google
✓ GET  /auth/google/callback
✓ GET  /auth/facebook
✓ GET  /auth/facebook/callback
```

### 3.3 Test Google Login

1. Visit: `http://localhost:3000/index.html`
2. Click the "Google" button
3. You'll be redirected to Google's login
4. After login, you should be redirected back to your site with:
   - Account automatically created (if first time)
   - JWT token stored in localStorage
   - Redirect to menu.html

### 3.4 Test Facebook Login

1. Visit: `http://localhost:3000/register.html`
2. Click the "Facebook" button
3. You'll be redirected to Facebook's login
4. After login, same flow as Google

---

## 📱 How It Works (Technical)

### User Login Flow via Google

```
1. User clicks "Google" button
   ↓
2. Frontend redirects to /auth/google
   ↓
3. Backend redirects to Google's OAuth consent screen
   ↓
4. User approves & Google redirects to /auth/google/callback?code=...&state=...
   ↓
5. Backend exchanges code for access token
   ↓
6. Backend fetches user email/name from Google API
   ↓
7. Backend checks if email exists in users table:
   a) If yes → Update last_login, link OAuth account if needed
   b) If no → Create new user account
   ↓
8. Backend generates JWT token
   ↓
9. Backend redirects to menu.html with:
   - token=eyJhbGciOiJIUzI1NiIs...
   - user={"id":"...", "email":"..."}
   - provider=google
   ↓
10. Frontend detects parameters, stores in localStorage
    ↓
11. User logged in! ✅
```

### Database Operations

When a user logs in via OAuth:

1. **First time login via Google:**
   - New user record created in `users` table
   - `oauth_provider = 'google'`
   - `oauth_provider_id = <google_user_id>`
   - `email_verified_at = NOW()` (auto-verified)
   - `tier = 'BRONZE'` (default)

2. **Returning user:**
   - Find existing user by email
   - Link OAuth if not already linked
   - Update `last_login_at`

3. **Switching providers:**
   - If user has email registered via email/password
   - And logs in via Google with same email
   - OAuth account is linked to existing user
   - No duplicate account created

---

## 🔐 Security Features

✅ **State Parameter (CSRF Protection)**
- Each OAuth request generates unique state token
- State validated on callback
- Prevents OAuth state confusion attacks

✅ **Email Verification**
- OAuth providers verify emails on their end
- `email_verified_at` automatically set to NOW()
- Users can skip email verification step

✅ **Token Security**
- JWT tokens signed with `JWT_SECRET`
- Tokens include user ID, email, and tier
- Tokens expire after `JWT_EXPIRY` (7 days default)
- Sent via URL parameters (secure in HTTPS)

✅ **Rate Limiting**
- Existing rate limiters prevent brute force attempts
- Applied to all endpoint types

---

## 🚨 Troubleshooting

### "Google OAuth not configured"
**Problem:** Getting this error when clicking Google button
**Solution:** 
- Verify `GOOGLE_CLIENT_ID` in `.env` file
- Restart backend after updating `.env`
- Check Google Cloud Console for credentials

### Redirect URI mismatch
**Problem:** "Redirect URI mismatch" error from Google/Facebook
**Solution:**
- Ensure redirect URI in Google/Facebook console matches exactly:
  - `http://localhost:5000/auth/google/callback`
  - `http://localhost:5000/auth/facebook/callback`
- Note: production URLs should use HTTPS

### OAuth callback shows blank page
**Problem:** Redirected back but nothing happens
**Solution:**
- Check browser console for errors (F12 → Console)
- Check backend logs for OAuth errors
- Verify database is running (`psql -U friedays_user -d friedays_db -c "SELECT 1"`)

### "oauth_state_mismatch" error
**Problem:** OAuth security validation failed
**Solution:**
- This means an attack or session corruption was detected
- Clear browser cookies and try again
- Check that cookies are enabled

### Email not found from OAuth provider
**Problem:** "Could not retrieve email from provider"
**Solution:**
- Ensure your Google/Facebook account has public email enabled
- Try with a different account
- Check OAuth permissions in developer console

---

## 📊 Production Deployment

### Update Environment Variables

In production, change:

**backend/.env:**
```env
# Change these for production
GOOGLE_REDIRECT_URI=https://api.friedays.com/auth/google/callback
FACEBOOK_REDIRECT_URI=https://api.friedays.com/auth/facebook/callback
FRONTEND_URL=https://app.friedays.com

# Use strong, random JWT_SECRET
JWT_SECRET=generate-with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Register Production URLs

1. **Google Console:**
   - Settings → Credentials
   - Edit Client ID
   - Add authorized URIs:
     - `https://api.friedays.com`
     - `https://app.friedays.com`
   - Add redirect URIs:
     - `https://api.friedays.com/auth/google/callback`

2. **Facebook App:**
   - Settings → Basic
   - Add `friedays.com` to App Domains
   - Facebook Login → Settings
   - Update redirect URIs to HTTPS

### Enable HTTPS

```bash
# Redirect HTTP to HTTPS in backend
# Already handled by production deployment process
```

---

## 🔄 Linking Multiple OAuth Providers

Users can link multiple OAuth providers to one account:

1. User registers via Google → account created
2. Later, user tries to login via Facebook with same email
3. Backend finds existing account
4. Links Facebook OAuth to same account
5. User can now login with either provider

This prevents duplicate accounts and allows flexible authentication.

---

## 📈 Monitoring OAuth

### Check OAuth Logins

```sql
-- How many users logged in via each provider?
SELECT oauth_provider, COUNT(*) as count 
FROM users 
WHERE oauth_provider IS NOT NULL 
GROUP BY oauth_provider;

-- Recent OAuth activity
SELECT email, oauth_provider, last_login_at 
FROM users 
WHERE oauth_provider IS NOT NULL 
ORDER BY last_login_at DESC 
LIMIT 10;
```

### Debug OAuth Issues

Check backend logs:
```bash
tail -f backend/logs/oauth.log
```

Enable debug mode in server.js:
```javascript
console.log('OAuth redirect received:', { email, provider, oauth_id });
```

---

## ✏️ Customization

### Add More OAuth Providers

Follow this pattern for additional providers:

1. **Create new route file** `backend/routes/oauth-github.js`
2. **Implement endpoints:**
   - `GET /auth/github` → redirect to provider
   - `GET /auth/github/callback` → handle callback
3. **Add to server.js** → `app.use('/auth', githubOAuthRoutes);`
4. **Update frontend** → Add GitHub button to index.html & register.html
5. **Set environment variables** → GitHub credentials

---

## 📝 API Reference

### OAuth Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/auth/google` | Redirect to Google consent screen |
| GET | `/auth/google/callback` | Handle Google callback |
| GET | `/auth/facebook` | Redirect to Facebook login |
| GET | `/auth/facebook/callback` | Handle Facebook callback |

### Response Format

All OAuth callbacks redirect with format:
```
/menu.html?token=<jwt_token>&user=<json_string>&provider=<provider_name>
```

**Parameters:**
- `token`: JWT token for authenticated requests
- `user`: JSON-encoded user object (email, name, tier, etc.)
- `provider`: Which OAuth provider was used ('google' or 'facebook')

---

## 🔗 Useful Links

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [OAuth 2.0 Spec](https://tools.ietf.org/html/rfc6749)

---

## 📞 Support

**Common Questions:**

**Q: Why do I need to create Google/Facebook apps?**
A: These provider apps verify your identity to users. Users can then trust they're actually logging in with their real Google/Facebook account, not a fake site.

**Q: Can users use OAuth without an email?**
A: No, email is required. Users must allow your app to access their email. If they refuse, login fails with "oauth_email_not_found".

**Q: What happens if I change the callback URL?**
A: OAuth will fail with "Redirect URI mismatch". You must update both your backend `.env` AND the provider's developer console.

**Q: Is OAuth more secure than email/password?**
A: OAuth is convenient but requires trusting the provider. Email/password with proper hashing (bcrypt) is equally secure. Use both for flexibility.

**Q: Can I remove email/password login?**
A: Yes, but not recommended. Always offer email/password as fallback since social providers can have outages.

---

**Last Updated:** March 28, 2026
**OAuth Version:** 2.0
**Status:** Production Ready

