import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { query } from '../db/pool.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/auth/google/callback';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:5000/auth/facebook/callback';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ============================================================================
// GOOGLE OAUTH
// ============================================================================

/**
 * GET /auth/google
 * Redirects to Google OAuth consent screen
 */
router.get('/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'Google OAuth not configured' });
  }

  const state = uuidv4(); // CSRF protection token
  const scope = encodeURIComponent('openid email profile');
  
  // Store state in session (or use signed cookie in production)
  res.cookie('oauth_state', state, { httpOnly: true, maxAge: 600000 }); // 10 min

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&state=${state}`;

  res.redirect(authUrl);
});

/**
 * GET /auth/google/callback
 * Handles Google OAuth callback
 */
router.get(
  '/google/callback',
  asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    const storedState = req.cookies.oauth_state;

    if (!code || !state || state !== storedState) {
      return res.redirect(`${FRONTEND_URL}/index.html?error=oauth_state_mismatch`);
    }

    try {
      // Exchange code for tokens
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_REDIRECT_URI,
      });

      const accessToken = tokenResponse.data.access_token;

      // Get user info from Google
      const userResponse = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const { email, name, picture, given_name, family_name } = userResponse.data;

      if (!email) {
        return res.redirect(`${FRONTEND_URL}/index.html?error=oauth_email_not_found`);
      }

      // Find or create user in database
      let user = await findOrCreateOAuthUser({
        email,
        first_name: given_name || name?.split(' ')[0] || 'User',
        last_name: family_name || name?.split(' ')[1] || '',
        avatar_url: picture,
        oauth_provider: 'google',
        oauth_id: userResponse.data.id,
      });

      // Generate JWT token
      const jwtToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          tier: user.tier,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      // Redirect to frontend with token and user data
      const userData = encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        tier: user.tier,
        loyalty_points: user.loyalty_points,
        total_spent: user.total_spent,
      }));

      res.redirect(
        `${FRONTEND_URL}/menu.html?token=${jwtToken}&user=${userData}&provider=google`
      );
    } catch (error) {
      console.error('Google OAuth error:', error);
      res.redirect(`${FRONTEND_URL}/index.html?error=oauth_failed`);
    }
  })
);

// ============================================================================
// FACEBOOK OAUTH
// ============================================================================

/**
 * GET /auth/facebook
 * Redirects to Facebook OAuth dialog
 */
router.get('/facebook', (req, res) => {
  if (!FACEBOOK_APP_ID) {
    return res.status(500).json({ error: 'Facebook OAuth not configured' });
  }

  const state = uuidv4(); // CSRF protection token
  const scope = encodeURIComponent('email public_profile');

  // Store state in session
  res.cookie('oauth_state', state, { httpOnly: true, maxAge: 600000 }); // 10 min

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${FACEBOOK_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}` +
    `&scope=${scope}` +
    `&state=${state}` +
    `&response_type=code`;

  res.redirect(authUrl);
});

/**
 * GET /auth/facebook/callback
 * Handles Facebook OAuth callback
 */
router.get(
  '/facebook/callback',
  asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    const storedState = req.cookies.oauth_state;

    if (!code || !state || state !== storedState) {
      return res.redirect(`${FRONTEND_URL}/index.html?error=oauth_state_mismatch`);
    }

    try {
      // Exchange code for access token
      const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          client_id: FACEBOOK_APP_ID,
          client_secret: FACEBOOK_APP_SECRET,
          code,
          redirect_uri: FACEBOOK_REDIRECT_URI,
        },
      });

      const accessToken = tokenResponse.data.access_token;

      // Get user info from Facebook
      const userResponse = await axios.get('https://graph.facebook.com/me', {
        params: {
          access_token: accessToken,
          fields: 'id,email,first_name,last_name,picture.width(200).height(200)',
        },
      });

      const { id, email, first_name, last_name, picture } = userResponse.data;

      if (!email) {
        return res.redirect(`${FRONTEND_URL}/index.html?error=oauth_email_not_found`);
      }

      // Find or create user in database
      let user = await findOrCreateOAuthUser({
        email,
        first_name: first_name || 'User',
        last_name: last_name || '',
        avatar_url: picture?.data?.url,
        oauth_provider: 'facebook',
        oauth_id: id,
      });

      // Generate JWT token
      const jwtToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          tier: user.tier,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      // Redirect to frontend with token and user data
      const userData = encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        tier: user.tier,
        loyalty_points: user.loyalty_points,
        total_spent: user.total_spent,
      }));

      res.redirect(
        `${FRONTEND_URL}/menu.html?token=${jwtToken}&user=${userData}&provider=facebook`
      );
    } catch (error) {
      console.error('Facebook OAuth error:', error);
      res.redirect(`${FRONTEND_URL}/index.html?error=oauth_failed`);
    }
  })
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find or create a user via OAuth provider
 */
async function findOrCreateOAuthUser({
  email,
  first_name,
  last_name,
  avatar_url,
  oauth_provider,
  oauth_id,
}) {
  try {
    // Check if OAuth account exists
    let result = await query(
      'SELECT * FROM users WHERE oauth_provider = $1 AND oauth_provider_id = $2',
      [oauth_provider, oauth_id]
    );

    if (result.rows.length > 0) {
      // OAuth account exists - update last login
      await query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [result.rows[0].id]
      );
      return result.rows[0];
    }

    // Check if email already exists
    result = await query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length > 0) {
      // Email exists but different provider - link OAuth to existing account
      const user = result.rows[0];
      await query(
        'UPDATE users SET oauth_provider = $1, oauth_provider_id = $2, last_login_at = NOW() WHERE id = $3',
        [oauth_provider, oauth_id, user.id]
      );
      return user;
    }

    // Create new user
    const userId = uuidv4();
    const newUserResult = await query(
      `INSERT INTO users (
        id, email, first_name, last_name,
        oauth_provider, oauth_provider_id, email_verified_at,
        phone, address_line1, city, postal_code, country,
        terms_accepted_at, privacy_accepted_at,
        tier, loyalty_points, total_spent,
        created_at, updated_at, last_login_at, account_status
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, $11, NOW(), NOW(), $12, $13, $14, NOW(), NOW(), NOW(), $15)
      RETURNING *`,
      [
        userId,
        email,
        first_name,
        last_name,
        oauth_provider,
        oauth_id,
        '+1-pending', // Placeholder phone (required field)
        'Via ' + oauth_provider + ' OAuth', // Placeholder address
        'N/A', // Placeholder city
        '00000', // Placeholder postal code
        'US', // Placeholder country
        'BRONZE', // Default tier
        0, // Initial loyalty points
        0, // Initial total spent
        'active', // Account status
      ]
    );

    return newUserResult.rows[0];
  } catch (error) {
    console.error('OAuth user creation error:', error);
    throw error;
  }
}

export default router;
