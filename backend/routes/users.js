import express from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * Middleware to verify JWT token
 */
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ============================================================================
// Get Current User Profile
// ============================================================================

router.get(
  '/me',
  verifyToken,
  asyncHandler(async (req, res) => {
    const users = await query('SELECT * FROM users WHERE id = $1', [req.user.user_id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    res.json({
      id: user.id,
      email: user.email,
      email_verified_at: user.email_verified_at,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      phone_secondary: user.phone_secondary,
      address_line1: user.address_line1,
      address_line2: user.address_line2,
      city: user.city,
      postal_code: user.postal_code,
      country: user.country,
      address_notes: user.address_notes,
      marketing_opt_in: user.marketing_opt_in,
      tier: user.tier,
      loyalty_points: user.loyalty_points,
      total_spent: user.total_spent,
      account_status: user.account_status,
      created_at: user.created_at,
      last_login_at: user.last_login_at,
    });
  })
);

// ============================================================================
// Update User Profile
// ============================================================================

router.put(
  '/me',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { first_name, last_name, phone, phone_secondary, address_line1, address_line2, city, postal_code, country, address_notes, marketing_opt_in } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (first_name !== undefined) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(last_name);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (phone_secondary !== undefined) {
      updates.push(`phone_secondary = $${paramCount++}`);
      values.push(phone_secondary);
    }
    if (address_line1 !== undefined) {
      updates.push(`address_line1 = $${paramCount++}`);
      values.push(address_line1);
    }
    if (address_line2 !== undefined) {
      updates.push(`address_line2 = $${paramCount++}`);
      values.push(address_line2);
    }
    if (city !== undefined) {
      updates.push(`city = $${paramCount++}`);
      values.push(city);
    }
    if (postal_code !== undefined) {
      updates.push(`postal_code = $${paramCount++}`);
      values.push(postal_code);
    }
    if (country !== undefined) {
      updates.push(`country = $${paramCount++}`);
      values.push(country.toUpperCase());
    }
    if (address_notes !== undefined) {
      updates.push(`address_notes = $${paramCount++}`);
      values.push(address_notes);
    }
    if (marketing_opt_in !== undefined) {
      updates.push(`marketing_opt_in = $${paramCount++}`);
      values.push(marketing_opt_in);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.user.user_id);

    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await query(updateQuery, values);

    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result[0];

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        phone_secondary: user.phone_secondary,
        address_line1: user.address_line1,
        address_line2: user.address_line2,
        city: user.city,
        postal_code: user.postal_code,
        country: user.country,
        address_notes: user.address_notes,
        marketing_opt_in: user.marketing_opt_in,
        tier: user.tier,
      },
    });
  })
);

// ============================================================================
// Get User Orders (for tier calculation)
// ============================================================================

router.get(
  '/me/orders',
  verifyToken,
  asyncHandler(async (req, res) => {
    const users = await query('SELECT * FROM users WHERE id = $1', [req.user.user_id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    res.json({
      tier: user.tier,
      loyalty_points: user.loyalty_points,
      total_spent: user.total_spent,
    });
  })
);

export default router;
