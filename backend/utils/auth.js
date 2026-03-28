import bcrypt from 'bcrypt';
import crypto from 'crypto';
import validator from 'validator';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

// ============================================================================
// Password Management
// ============================================================================

/**
 * Hash a plaintext password using bcrypt
 */
export async function hashPassword(password) {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push('At least 8 characters required');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Must contain number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Must contain special character');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Token Management
// ============================================================================

/**
 * Generate cryptographically secure random token
 */
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken() {
  return generateSecureToken(32);
}

/**
 * Hash a token for storage (never store raw token)
 */
export function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

// ============================================================================
// Input Validation
// ============================================================================

/**
 * Validate email format
 */
export function isValidEmail(email) {
  return validator.isEmail(email);
}

/**
 * Validate Philippine phone number (+63XXXXXXXXXX)
 */
export function isValidPhone(phone) {
  const normalized = phone.replace(/\s/g, '');
  return /^\+63\d{10}$/.test(normalized);
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input) {
  return validator.trim(input).substring(0, 255);
}

/**
 * Validate postal code (basic)
 */
export function isValidPostalCode(code) {
  return code && code.length > 0 && code.length <= 20;
}

/**
 * Validate country code (ISO 3166-1 alpha-2)
 */
export function isValidCountryCode(code) {
  return /^[A-Z]{2}$/.test(code);
}

// ============================================================================
// Security Utilities
// ============================================================================

/**
 * Add delay to prevent timing attacks
 */
export async function addTimingDelay(minMs = 50, maxMs = 150) {
  const delay = Math.random() * (maxMs - minMs) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Get client IP address from request
 */
export function getClientIP(req) {
  return req.ip || 
         req.headers['x-forwarded-for']?.split(',')[0] || 
         req.socket.remoteAddress || 
         'unknown';
}

/**
 * Get user agent
 */
export function getUserAgent(req) {
  return req.get('user-agent') || 'unknown';
}
