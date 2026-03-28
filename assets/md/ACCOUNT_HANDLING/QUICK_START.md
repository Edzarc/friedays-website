# Quick Start: Get Friedays Auth Running NOW

This is the fastest way to get authentication working. Full documentation available in other files.

---

## ⚡ 5-Minute Quick Start (Email/Password Only)

Skip OAuth for now—just get basic auth working:

### Step 1: Backend Setup (2 minutes)

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env with JUST these values:
# DATABASE_URL=postgresql://friedays_user:password@localhost:5432/friedays_db
# JWT_SECRET=put-any-random-secret-here-at-least-32-chars

# Install & start
npm install
npm run dev
```

Expected: Server starts on `http://localhost:5000` ✅

### Step 2: Frontend Setup (1 minute)

```bash
# In NEW terminal window
python -m http.server 3000
```

Expected: Server starts on `http://localhost:3000` ✅

### Step 3: Test (2 minutes)

1. Go to: `http://localhost:3000/register.html`
2. Fill in form with test data
3. Click "Create Account"
4. Go to: `http://localhost:3000/index.html`
5. Login with credentials
6. Redirected to `menu.html` ✅

**Done!** Email/password authentication works.

---

## 🔗 30-Minute: Add Google/Facebook Login

### Step 1: Get Google Credentials (10 minutes)

1. Go to: https://console.cloud.google.com/
2. Create project → Enable Google+ API → Create OAuth 2.0 credentials
3. Add these redirect URIs:
   - `http://localhost:5000/auth/google/callback`
4. Copy: Client ID and Client Secret

### Step 2: Get Facebook Credentials (10 minutes)

1. Go to: https://developers.facebook.com/
2. Create app → Add Facebook Login product
3. Add redirect URI:
   - `http://localhost:5000/auth/facebook/callback`
4. Copy: App ID and App Secret

### Step 3: Update Backend (5 minutes)

Edit `backend/.env`, add:

```env
GOOGLE_CLIENT_ID=your-id-here
GOOGLE_CLIENT_SECRET=your-secret-here
FACEBOOK_APP_ID=your-id-here
FACEBOOK_APP_SECRET=your-secret-here
```

Restart backend: Kill process (Ctrl+C), run `npm run dev` again

### Step 4: Test OAuth (5 minutes)

1. Visit: `http://localhost:3000/index.html`
2. Click "Google" button
3. Login to Google
4. Should redirect back and login ✅
5. Click "Facebook" button (same process)

**Done!** OAuth works.

---

## 🐘 Database Setup (First Time Only)

If backend fails to connect to database:

### Option A: Using PostgreSQL CLI

```bash
# Login to PostgreSQL
psql -U postgres

# In psql, run:
CREATE ROLE friedays_user WITH LOGIN PASSWORD 'password';
CREATE DATABASE friedays_db OWNER friedays_user;
ALTER ROLE friedays_user CREATEDB;
\q
```

Test connection:
```bash
psql -U friedays_user -d friedays_db -c "SELECT 1"
```

### Option B: Using pgAdmin (GUI)

1. Open pgAdmin (usually http://localhost:5050)
2. Create server "localhost"
3. Right-click "Databases" → Create → Database "friedays_db"
4. Right-click "Login/Group Roles" → Create → Role "friedays_user"
5. In backend/.env set: `DATABASE_URL=postgresql://friedays_user:password@localhost:5432/friedays_db`

---

## ✅ Verification Commands

Check everything is working:

```bash
# Check backend is running
curl http://localhost:5000/health

# Check database exists
psql -U friedays_user -d friedays_db -c "SELECT * FROM users LIMIT 1"

# Check users table
psql -U friedays_user -d friedays_db -c "SELECT COUNT(*) as user_count FROM users"
```

Expected outputs:
- `{"status":"ok"}` ← Backend OK
- No error when running psql commands ← Database OK
- `0` ← No users yet (normal for first time) ← Tables OK

---

## 🚨 Common Problems & Fixes

| Problem | Solution |
|---------|----------|
| "Cannot connect to database" | Check DATABASE_URL in .env, PostgreSQL running |
| "Google button does 404" | Restart backend after updating .env |
| "Blank page after Google login" | Check browser console (F12), backend logs |
| "password_hash column doesn't exist" | Run: `cd backend && npm run migrate` |
| "Too many requests" | Wait 15 minutes or restart backend |

---

## 📁 File Structure

```
friedays-website/
├── index.html ← Login page (UPDATED with OAuth buttons)
├── register.html ← Registration (UPDATED with OAuth buttons)
├── menu.html ← Redirect after login
├── css/
│   ├── auth.css ← Auth styling (UNIFIED with Friedays colors)
│   └── styles.css ← Friedays design system
├── js/
│   ├── auth.js ← Auth logic (UPDATED with OAuth handler)
│   ├── main.js ← Storage utility
│   └── menu.js ← Menu logic
└── backend/
    ├── server.js ← Express app (UPDATED with OAuth routes)
    ├── .env ← Configuration (YOU MUST CREATE THIS)
    ├── package.json ← Dependencies (UPDATED with cookie-parser)
    ├── routes/
    │   ├── auth.js ← Email/password routes
    │   ├── users.js ← User profile routes
    │   └── oauth.js ← Google/Facebook routes (NEW)
    ├── db/
    │   ├── pool.js ← Database connection
    │   └── init.js ← Database schema
    └── utils/
        ├── auth.js ← Password hashing, validation
        └── email.js ← Email templates
```

---

## 🔑 Environment Variables Explained

### Required (for any auth to work)
```env
DATABASE_URL=postgresql://friedays_user@localhost:5432/friedays_db
JWT_SECRET=any-random-string-at-least-32-chars
```

### Email (optional, uses console fallback)
```env
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### OAuth (optional, add if you want social login)
```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx
```

### Frontend (optional, change if not localhost)
```env
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

---

## 📞 What to Do Next

### If email/password works:
✅ Done! Authentication is operational
- Users can register via form
- Users can login with email/password
- System tracks login attempts, resets passwords, etc.

### If you want OAuth:
📖 Follow **OAUTH_SETUP.md** for detailed setup
- 30 minutes to add Google & Facebook
- Both are optional but recommended

### If you want to deploy:
📖 Follow **INTEGRATION_CHECKLIST.md** Phase 6
- Change environment variables
- Update HTTPS/SSL
- Set up backups
- Go live!

---

## 🎯 Success Indicators

| Milestone | How to Check | Status |
|-----------|-------------|--------|
| Database connected | Backend starts without error | ✅ |
| Registration works | Can create account at /register.html | ✅ |
| Email verification | Check console for verification link | ✅ |
| Login works | Can login at /index.html | ✅ |
| Session stored | Check localStorage in browser (F12) | ✅ |
| OAuth works | Click Google/Facebook button, redirects back | ✅ |

---

## 📚 Full Documentation

- **This file** → Quick start (you are here)
- **REWORK_SUMMARY.md** → What was changed and why
- **OAUTH_SETUP.md** → Detailed OAuth configuration
- **INTEGRATION_CHECKLIST.md** → Complete setup guide
- **API_REFERENCE.md** → API endpoints for developers
- **backend/SETUP.md** → Backend installation details

---

## ⏱️ Estimated Times

| Task | Time | Difficulty |
|------|------|-----------|
| Basic auth (email/pwd) | 5 min | Easy |
| Database setup | 5 min | Easy |
| Debug database issues | 10 min | Medium |
| Add OAuth | 30 min | Medium |
| Production deployment | 1 hour | Hard |

---

## 🚀 One-Command Start (After Initial Setup)

Once configured, start everything with:

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend (after backend starts)
python -m http.server 3000

# Then visit http://localhost:3000
```

**That's it!** All authentication features available.

---

## 💬 Questions?

1. **"Is OAuth required?"** No, email/password works standalone
2. **"What if Google/Facebook keys don't work?"** Delete OAuth buttons, auth still works
3. **"Can I skip email verification?"** OAuth users bypass it automatically
4. **"Can I use different database?"** Yes, change DATABASE_URL in .env
5. **"Is production setup different?"** Yes, follow INTEGRATION_CHECKLIST.md Phase 6

---

**Version:** 2.0
**Last Updated:** March 28, 2026
**Status:** Production Ready

You're all set! 🎉
