# Friedays Authentication System - Integration Checklist

This guide walks you through getting the authentication system up and running.

---

## Phase 1: Backend Setup (30 minutes)

### 1.1 Install Node-LTS (if not already installed)
- [ ] Download from https://nodejs.org (LTS version)
- [ ] Verify: `node --version` should show v18+ or v20+
- [ ] Verify: `npm --version` should show v9+

### 1.2 Install PostgreSQL (if not already installed)
- [ ] Download from https://www.postgresql.org/download/
- [ ] During install, set password for `postgres` user (remember this!)
- [ ] Verify: `psql --version` should show v12+
- [ ] Verify: `psql -U postgres -c "SELECT 1"` connects

### 1.3 Create Backend Configuration File

```bash
cd backend
cp .env.example .env
```

Then edit `backend/.env` and set these values:

```
# Database - CRITICAL
DATABASE_URL=postgresql://friedays_user:password@localhost:5432/friedays_db

# JWT - Generate a random string (32+ characters)
# Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-generated-secret-here

# Email - Can skip for testing (verification links show in console)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-not-regular-password

# Frontend URL
FRONTEND_URL=http://localhost:3000
API_PORT=5000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5
```

### 1.4 Create PostgreSQL Database

Run this in your terminal as `postgres` user:

```bash
# Connect to PostgreSQL
psql -U postgres

# In psql prompt, run these commands:
CREATE ROLE friedays_user WITH LOGIN PASSWORD 'password';
CREATE DATABASE friedays_db OWNER friedays_user;
ALTER ROLE friedays_user CREATEDB;
\q
```

Verify it works:
```bash
psql -U friedays_user -d friedays_db -h localhost -c "SELECT 1"
```

### 1.5 Install Backend Dependencies

```bash
cd backend
npm install
```

Expected output: Shows ~300+ packages installed in 10-30 seconds

### 1.6 Initialize Database Schema

```bash
cd backend
npm run init-db
```

Expected output: Shows "Database initialized successfully" or "Tables already exist"

### 1.7 Start Backend Server

```bash
cd backend
npm run dev
```

Expected output:
```
🍗 FRIEDAYS AUTH SERVER RUNNING 🍗
Server is running on http://localhost:5000
Health check available at http://localhost:5000/health
```

✅ **Backend is now RUNNING**

---

## Phase 2: Frontend Setup (10 minutes)

### 2.1 Verify Frontend Files Exist

Check these files exist in your project root:
- [ ] `index.html` (updated with email field)
- [ ] `register.html` (new)
- [ ] `forgot-password.html` (new)
- [ ] `reset-password.html` (new)
- [ ] `verify-email.html` (new)
- [ ] `css/auth.css` (new)
- [ ] `js/auth.js` (new)

### 2.2 Start Frontend Server (in NEW terminal window)

**Option A: Using Python (easiest)**
```bash
python -m http.server 3000
```

**Option B: Using Node**
```bash
npx http-server -p 3000
```

Expected output: Shows "Serving HTTP on http://localhost:3000"

✅ **Frontend is now RUNNING**

---

## Phase 3: Test Authentication Flow (15 minutes)

### 3.1 Test Backend Health

In browser, visit: http://localhost:5000/health

Expected response:
```json
{"status":"ok"}
```

### 3.2 Register a New Account

1. Visit: http://localhost:3000/register.html
2. Fill in the form:
   - First Name: `Test`
   - Last Name: `User`
   - Email: `test@example.com` (use any email)
   - Phone: `+12125551234` (E.164 format)
   - Address: `123 Main St`
   - City: `New York`
   - Country: `US`
   - Password: `Test@1234!` (must meet strength requirements)
   - Check both boxes (terms, privacy)
3. Click "Register"
4. Expected: "Verification email sent" message

### 3.3 Verify Email

1. Check browser console (F12 → Console tab)
2. Look for verification link that looks like:
   ```
   http://localhost:3000/verify-email.html?token=abc123...
   ```
3. Copy & paste entire link in browser
4. Expected: "Email verified successfully" message

### 3.4 Login

1. Visit: http://localhost:3000/index.html
2. Enter:
   - Email: `test@example.com`
   - Password: `Test@1234!`
3. Click "Login"
4. Expected: Redirects to `menu.html` and shows user logged in

### 3.5 Check Stored Authentication

1. In browser, open Developer Tools (F12)
2. Go to Application → Local Storage
3. Should see:
   - `friedays_token`: JWT token (long string)
   - `friedays_user`: User data (JSON)
   - `friedays_session`: Session info

✅ **Authentication Works!**

---

## Phase 4: Optional - Add Real Email Service (20 minutes)

### 4.1 Configure Gmail App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select: Mail → Windows Computer (or your device)
3. Google will generate a 16-character password like: `abcd efgh ijkl mnop`
4. Update `backend/.env`:
   ```
   SMTP_USER=your-gmail@gmail.com
   SMTP_PASS=abcd efgh ijkl mnop
   ```

### 4.2 Restart Backend

```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

### 4.3 Test Email

1. Visit: http://localhost:3000/forgot-password.html
2. Enter your email
3. Check your email inbox for password reset link
4. (May take 10-30 seconds to arrive)

✅ **Email is now WORKING!**

---

## Phase 5: Integrate with Existing Pages (Optional)

### 5.1 Update menu.js

After user logs in, replace hardcoded user data:

```javascript
// OLD WAY (still works)
const currentUser = { tier: 'BRONZE', loyaltyPoints: 0 };

// NEW WAY (after authentication)
const userData = Storage.get('friedays_user');
const currentUser = userData ? JSON.parse(userData) : { tier: 'BRONZE', loyaltyPoints: 0 };
```

### 5.2 Update checkout.js

Get user tier for order processing:

```javascript
const userData = Storage.get('friedays_user');
const userTier = userData ? JSON.parse(userData).tier : 'BRONZE';

// Use userTier to calculate discount
const discount = calculateTierDiscount(userTier);
```

### 5.3 Update account.js

Show authenticated user's account information:

```javascript
const userData = Storage.get('friedays_user');
if (userData) {
  const user = JSON.parse(userData);
  document.getElementById('user-email').textContent = user.email;
  document.getElementById('user-tier').textContent = user.tier;
  document.getElementById('loyalty-points').textContent = user.loyalty_points;
}
```

---

## Phase 6: Deploy to Production (When Ready)

### 6.1 Environment Configuration

```bash
cd backend
# Create production .env (NEVER commit to git)
cp .env.example .env.production
# Edit with REAL values
nano .env.production

# Set NODE_ENV
export NODE_ENV=production
```

### 6.2 Use Production Environment

```bash
npm run prod
# or
NODE_ENV=production npm start
```

### 6.3 Update Frontend URLs

In `js/auth.js`, change:
```javascript
const API_BASE_URL = 'https://api.friedays.com'; // Your production domain
```

### 6.4 SSL/HTTPS

- [ ] Get SSL certificate (LetsEncrypt is free)
- [ ] Update FRONTEND_URL to https://
- [ ] Update API_BASE_URL to https://
- [ ] Test all forms work over HTTPS

### 6.5 Database Backups

Set up automated backups:
```bash
# Daily backup script
pg_dump -U friedays_user friedays_db > backup_$(date +%Y%m%d).sql
```

---

## Troubleshooting

### Q: Backend won't start - "Module not found"
**A:** Run `npm install` in backend directory

### Q: Database connection fails
**A:** 
1. Verify PostgreSQL is running: `psql -U postgres -c "SELECT 1"`
2. Check DATABASE_URL in .env matches your setup
3. Run: `npm run init-db` to create schema

### Q: CORS errors in browser console
**A:** 
1. Verify FRONTEND_URL in backend/.env matches your frontend URL
2. Restart backend after changing .env

### Q: Email not sending
**A:**
1. Check SMTP credentials in .env (especially app-password format)
2. Verify firewall allows port 587 (SMTP)
3. Check backend logs for error messages
4. Try simpler email provider (Mailgun, SendGrid) if Gmail has issues

### Q: Passwords not matching strength requirements
**A:** Passwords must contain:
- At least 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*)

Example good password: `MyPassword123!`

### Q: Can't login after registration
**A:** You must verify your email first. Look for the verification link in console.

### Q: Phone number validation fails
**A:** Use E.164 format:
- US: +1 (country code 1)
- Format: +1 + area code + number → `+12125551234`
- Other countries: +[country code][number]

---

## Verification Checklist

Once all phases complete, verify by checking:

- [ ] Backend running on http://localhost:5000 (shows health: ok)
- [ ] Frontend running on http://localhost:3000 (pages load)
- [ ] Can register new account (form validates)
- [ ] Can verify email (link in console)
- [ ] Can login with email/password (redirects to menu)
- [ ] JWT token stored in localStorage
- [ ] User profile stored in localStorage
- [ ] Logout clears both tokens
- [ ] Forgot password shows success message (email in console if SMTP not set)

✅ **Authentication System is FULLY OPERATIONAL**

---

## File Reference

### Backend Files (You Edited)
- `backend/.env` ← **You must create this from .env.example**
- `backend/package.json` ← Already includes all dependencies
- `backend/server.js` ← Already configured
- `backend/db/` ← Schema ready to initialize

### Frontend Files (New or Updated)
- `index.html` ← UPDATED (login form now uses email)
- `register.html` ← NEW
- `forgot-password.html` ← NEW
- `reset-password.html` ← NEW
- `verify-email.html` ← NEW
- `css/auth.css` ← NEW
- `js/auth.js` ← NEW (handles all form logic)

### Documentation Files
- `AUTHENTICATION_README.md` ← Overview (this is top-level)
- `backend/SETUP.md` ← Backend setup details
- `assets/md/AUTHENTICATION_SYSTEM.md` ← Full design docs

---

## Next Steps

1. **Start NOW:** Follow Phase 1-3 (45 minutes total)
2. **Optional:** Set up email (Phase 4, 20 minutes)
3. **Optional:** Integrate existing pages (Phase 5, 15 minutes)
4. **When Ready:** Deploy to production (Phase 6)

---

**Last Updated:** March 28, 2026
**Difficulty:** Beginner (follow steps in order)
**Time Required:** 45 minutes to fully functional system

Need help? Check `backend/SETUP.md` for detailed backend documentation.

Good luck! 🍗
