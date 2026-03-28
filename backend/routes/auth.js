import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateSecureToken,
  hashToken,
  isValidEmail,
  isValidPhone,
  getClientIP,
  getUserAgent,
  addTimingDelay,
} from '../utils/auth.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendWelcomeEmail,
  sendAccountLockedEmail,
} from '../utils/email.js';
import { query } from '../db/pool.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiters
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many registration attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Too many password reset requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// Register
// ============================================================================

router.post(
  '/register',
  registerLimiter,
  asyncHandler(async (req, res) => {
    const {
      email,
      password,
      password_confirm,
      first_name,
      last_name,
      phone,
      address_line1,
      address_line2,
      city,
      postal_code,
      country,
      marketing_opt_in,
      terms_accepted,
      privacy_accepted,
    } = req.body;

    // Validate required fields
    if (!email || !password || !first_name || !last_name || !phone || !address_line1 || !city || !postal_code) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Normalize country to Philippines-only
    const normalizedCountry = (country || 'PH').toUpperCase();

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate passwords match
    if (password !== password_confirm) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Validate password strength
    const { valid, errors: passwordErrors } = validatePasswordStrength(password);
    if (!valid) {
      return res.status(400).json({ errors: passwordErrors });
    }

    // Validate phone format
    if (!isValidPhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format. Use Philippines format: +63XXXXXXXXXX' });
    }

    // Validate acceptance
    if (!terms_accepted || !privacy_accepted) {
      return res.status(400).json({ error: 'You must accept Terms & Conditions and Privacy Policy' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = uuidv4();
    const now = new Date();

    try {
      await query(
        `INSERT INTO users (
          id, email, password_hash, first_name, last_name, phone, phone_secondary,
          address_line1, address_line2, city, postal_code, normalizedCountry,
          terms_accepted_at, privacy_accepted_at, marketing_opt_in,
          account_status, tier, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          userId,
          email.toLowerCase(),
          passwordHash,
          first_name,
          last_name,
          phone,
          address_line2 || null,
          address_line1,
          address_line2 || null,
          city,
          postal_code,
          normalizedCountry,
          now,
          now,
          marketing_opt_in || false,
          'pending',
          'BRONZE',
          now,
          now,
        ]
      );

      // Generate email verification token
      const token = generateSecureToken(32);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await query(
        `INSERT INTO email_verification_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, token, expiresAt]
      );

      // Send verification email
      const verifyUrl = `${process.env.APP_URL}/auth/verify-email?token=${token}`;
      await sendVerificationEmail(email, first_name, verifyUrl);

      res.status(201).json({
        message: 'Account created successfully. Check your email to verify your account.',
        user: {
          id: userId,
          email,
          first_name,
          tier: 'BRONZE',
        },
      });
    } catch (error) {
      if (error.code === '23505') {
        // Unique constraint - email already exists
        return res.status(409).json({ error: 'Email already registered' });
      }
      throw error;
    }
  })
);

// ============================================================================
// Login
// ============================================================================

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const ipAddress = getClientIP(req);
    const userAgent = getUserAgent(req);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const users = await query('SELECT * FROM users WHERE LOWER(email) = $1', [email.toLowerCase()]);

    if (users.length === 0) {
      // Record failed attempt
      await query(
        `INSERT INTO login_attempts (email, ip_address, user_agent, success, attempted_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [email.toLowerCase(), ipAddress, userAgent, false]
      );
      await addTimingDelay();
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // Check if locked
    if (user.account_locked_until && user.account_locked_until > new Date()) {
      const remainingMinutes = Math.ceil((user.account_locked_until - new Date()) / 60000);
      return res.status(403).json({
        error: `Account locked. Try again in ${remainingMinutes} minutes.`,
      });
    }

    // Check if email verified
    if (!user.email_verified_at) {
      return res.status(403).json({
        error: 'Please verify your email first',
        user_id: user.id,
      });
    }

    // Verify password
    const passwordMatch = await verifyPassword(password, user.password_hash);

    if (!passwordMatch) {
      // Record failed attempt
      await query(
        `INSERT INTO login_attempts (user_id, email, ip_address, user_agent, success, attempted_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [user.id, email.toLowerCase(), ipAddress, userAgent, false]
      );

      // Check if should lock account
      const recentFailures = await query(
        `SELECT COUNT(*) as count FROM login_attempts
         WHERE email = $1 AND attempted_at > NOW() - INTERVAL '${process.env.LOGIN_ATTEMPT_WINDOW_MINUTES || 15} minutes' AND success = false`,
        [email.toLowerCase()]
      );

      const failureCount = recentFailures[0]?.count || 0;

      if (failureCount >= parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5')) {
        const unlockTime = new Date(Date.now() + parseInt(process.env.ACCOUNT_LOCKOUT_MINUTES || '30') * 60 * 1000);
        await query('UPDATE users SET account_locked_until = $1 WHERE id = $2', [unlockTime, user.id]);

        await sendAccountLockedEmail(user.email, user.first_name, unlockTime);
        await addTimingDelay();
        return res.status(429).json({ error: 'Account locked due to failed login attempts' });
      }

      await addTimingDelay();
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Success! Record attempt
    await query(
      `INSERT INTO login_attempts (user_id, email, ip_address, user_agent, success, attempted_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [user.id, email.toLowerCase(), ipAddress, userAgent, true]
    );

    // Update last login
    await query('UPDATE users SET last_login_at = NOW(), failed_login_count = 0 WHERE id = $1', [user.id]);

    // Generate JWT token
    const token = jwt.sign(
      { user_id: user.id, email: user.email, tier: user.tier },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        tier: user.tier,
        loyalty_points: user.loyalty_points,
        total_spent: user.total_spent,
      },
    });
  })
);

// ============================================================================
// Verify Email
// ============================================================================

router.get(
  '/verify-email',
  asyncHandler(async (req, res) => {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }

    const tokenRecords = await query(
      `SELECT user_id, expires_at, used_at FROM email_verification_tokens
       WHERE token = $1`,
      [token]
    );

    if (tokenRecords.length === 0 || tokenRecords[0].used_at) {
      return res.status(400).json({ error: 'Invalid or already used verification token' });
    }

    const tokenRecord = tokenRecords[0];

    if (tokenRecord.expires_at < new Date()) {
      return res.status(400).json({ error: 'Verification token expired' });
    }

    const userId = tokenRecord.user_id;

    // Update user
    await query('UPDATE users SET email_verified_at = NOW(), account_status = $1 WHERE id = $2', ['active', userId]);

    // Mark token used
    await query('UPDATE email_verification_tokens SET used_at = NOW() WHERE token = $1', [token]);

    // Send welcome email
    const users = await query('SELECT email, first_name FROM users WHERE id = $1', [userId]);
    if (users.length > 0) {
      await sendWelcomeEmail(users[0].email, users[0].first_name);
    }

    res.json({ message: 'Email verified successfully! You can now login.' });
  })
);

// ============================================================================
// Forgot Password
// ============================================================================

router.post(
  '/forgot-password',
  passwordResetLimiter,
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const ipAddress = getClientIP(req);

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Find user (generic response either way for security)
    const users = await query('SELECT id, first_name FROM users WHERE LOWER(email) = $1', [email.toLowerCase()]);

    if (users.length > 0) {
      const user = users[0];

      // Generate reset token
      const token = generateSecureToken(32);
      const hash = hashToken(token);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      // Invalidate previous tokens
      await query(
        `UPDATE password_reset_tokens SET used_at = NOW() 
         WHERE user_id = $1 AND used_at IS NULL`,
        [user.id]
      );

      // Create new token
      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, requested_ip)
         VALUES ($1, $2, $3, $4)`,
        [user.id, hash, expiresAt, ipAddress]
      );

      // Send reset email
      const resetUrl = `${process.env.APP_URL}/auth/reset-password?token=${token}`;
      await sendPasswordResetEmail(email, user.first_name, resetUrl);
    }

    await addTimingDelay();

    // Generic response
    res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
  })
);

// ============================================================================
// Reset Password
// ============================================================================

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { token, password, password_confirm } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password !== password_confirm) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const { valid, errors } = validatePasswordStrength(password);
    if (!valid) {
      return res.status(400).json({ errors });
    }

    // Validate token
    const tokenHash = hashToken(token);
    const tokenRecords = await query(
      `SELECT user_id, expires_at, used_at FROM password_reset_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );

    if (tokenRecords.length === 0 || tokenRecords[0].used_at) {
      return res.status(400).json({ error: 'Invalid or already-used reset token' });
    }

    const tokenRecord = tokenRecords[0];

    if (tokenRecord.expires_at < new Date()) {
      return res.status(400).json({ error: 'Reset token expired' });
    }

    const userId = tokenRecord.user_id;

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update password
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);

    // Mark token used
    await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1', [tokenHash]);

    // Send confirmation email
    const users = await query('SELECT email, first_name FROM users WHERE id = $1', [userId]);
    if (users.length > 0) {
      await sendPasswordChangedEmail(users[0].email, users[0].first_name);
    }

    res.json({ message: 'Password reset successful. You can now login.' });
  })
);

export default router;
